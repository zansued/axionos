import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { authenticate, AuthContext } from "../_shared/auth.ts";
import { callAI } from "../_shared/ai-client.ts";

serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const auth = await authenticate(req);
  if (auth instanceof Response) return auth;
  const { user, serviceClient } = auth as AuthContext;

  try {
    const { initiativeId } = await req.json();
    if (!initiativeId) return errorResponse("initiativeId required", 400);

    // 1. Load initiative
    const { data: initiative, error: initErr } = await serviceClient
      .from("initiatives")
      .select("id, title, description, idea_raw, refined_idea, organization_id, discovery_payload, architecture_content")
      .eq("id", initiativeId)
      .single();
    if (initErr || !initiative) return errorResponse("Initiative not found", 404);

    // 2. Update status → analyzing_domain
    await serviceClient
      .from("initiatives")
      .update({ stage_status: "analyzing_domain" } as any)
      .eq("id", initiativeId);

    // Create job record
    const { data: job } = await serviceClient
      .from("initiative_jobs")
      .insert({
        initiative_id: initiativeId,
        user_id: user.id,
        stage: "domain_model_analysis",
        status: "running",
      })
      .select("id")
      .single();

    const startTime = Date.now();

    // 3. Load project_description from Project Brain
    const { data: descNode } = await serviceClient
      .from("project_brain_nodes")
      .select("metadata")
      .eq("initiative_id", initiativeId)
      .eq("node_type", "project_description")
      .maybeSingle();

    // Build project description from multiple sources
    const projectDescription = (descNode?.metadata as any)?.description
      || initiative.refined_idea
      || initiative.description
      || initiative.idea_raw
      || initiative.title;

    // 4. Call LLM to analyze domain
    const systemPrompt = `You are a Domain Model Architect. Analyze the project description and extract a structured domain model.

Return a valid JSON object with this exact structure:
{
  "entities": [
    {
      "name": "entity_name_snake_case",
      "attributes": [
        { "name": "attribute_name", "type": "uuid|text|integer|boolean|timestamp|jsonb|numeric|text[]", "primary_key": false, "nullable": true, "default": null, "description": "brief description" }
      ],
      "description": "What this entity represents"
    }
  ],
  "relationships": [
    { "from": "source_entity", "to": "target_entity", "field": "foreign_key_field", "type": "many_to_one|one_to_one|many_to_many", "description": "relationship description" }
  ],
  "business_rules": [
    { "rule": "description of the business rule", "entities_involved": ["entity1", "entity2"] }
  ]
}

Rules:
- Every entity must have an "id" attribute (uuid, primary key, default gen_random_uuid())
- Every entity must have "created_at" (timestamp, default now())
- Include foreign key fields in the source entity attributes
- Use snake_case for all names
- Be thorough: extract ALL entities, even implicit ones
- Include junction tables for many-to-many relationships
- Infer reasonable attributes even if not explicitly stated
- Include at least the standard attributes: id, created_at, updated_at`;

    const userPrompt = `Analyze this project and extract the complete domain model:

PROJECT: ${initiative.title}
DESCRIPTION: ${projectDescription}
${initiative.architecture_content ? `\nARCHITECTURE NOTES:\n${initiative.architecture_content.slice(0, 2000)}` : ""}
${initiative.discovery_payload ? `\nDISCOVERY CONTEXT:\n${JSON.stringify(initiative.discovery_payload).slice(0, 2000)}` : ""}

Extract ALL entities, their attributes with types, relationships and business rules.`;

    const aiResult = await callAI("", systemPrompt, userPrompt, true, 3, false);

    // 5. Parse domain model
    let domainModel: any;
    try {
      domainModel = JSON.parse(aiResult.content);
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = aiResult.content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        domainModel = JSON.parse(jsonMatch[1].trim());
      } else {
        throw new Error("Failed to parse domain model from AI response");
      }
    }

    // 6. Validate: at least one entity
    if (!domainModel.entities || domainModel.entities.length === 0) {
      console.warn("No entities detected, using fallback templates");
      domainModel = generateFallbackModel(initiative.title, projectDescription);
    }

    // Ensure all entities have required attributes
    for (const entity of domainModel.entities) {
      const hasId = entity.attributes.some((a: any) => a.name === "id");
      if (!hasId) {
        entity.attributes.unshift({
          name: "id",
          type: "uuid",
          primary_key: true,
          nullable: false,
          default: "gen_random_uuid()",
          description: "Primary key",
        });
      }
      const hasCreatedAt = entity.attributes.some((a: any) => a.name === "created_at");
      if (!hasCreatedAt) {
        entity.attributes.push({
          name: "created_at",
          type: "timestamp",
          primary_key: false,
          nullable: false,
          default: "now()",
          description: "Creation timestamp",
        });
      }
    }

    // 7. Build report
    const totalAttributes = domainModel.entities.reduce(
      (sum: number, e: any) => sum + (e.attributes?.length || 0), 0
    );
    const report = {
      entities_detected: domainModel.entities.length,
      relationships_detected: domainModel.relationships?.length || 0,
      attributes_detected: totalAttributes,
      business_rules_detected: domainModel.business_rules?.length || 0,
      entity_names: domainModel.entities.map((e: any) => e.name),
    };

    // 8. Store domain_model node in Project Brain
    await serviceClient.from("project_brain_nodes").upsert(
      {
        initiative_id: initiativeId,
        organization_id: initiative.organization_id,
        node_type: "domain_model",
        name: "Domain Model",
        status: "active",
        metadata: {
          ...domainModel,
          report,
          analyzed_at: new Date().toISOString(),
          model_used: aiResult.model,
          tokens_used: aiResult.tokens,
        },
      },
      { onConflict: "initiative_id,node_type,name" }
    );

    // 9. Also store the report node
    await serviceClient.from("project_brain_nodes").upsert(
      {
        initiative_id: initiativeId,
        organization_id: initiative.organization_id,
        node_type: "domain_model_report",
        name: "Domain Model Report",
        status: "active",
        metadata: report,
      },
      { onConflict: "initiative_id,node_type,name" }
    );

    const durationMs = Date.now() - startTime;

    // 10. Update job
    if (job) {
      await serviceClient
        .from("initiative_jobs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          duration_ms: durationMs,
          cost_usd: aiResult.costUsd,
          model: aiResult.model,
          outputs: { domain_model: domainModel, report },
        })
        .eq("id", job.id);
    }

    // 11. Update initiative status → domain_analyzed
    await serviceClient
      .from("initiatives")
      .update({ stage_status: "domain_analyzed" } as any)
      .eq("id", initiativeId);

    return jsonResponse({
      success: true,
      ...report,
      duration_ms: durationMs,
      model_used: aiResult.model,
      tokens_used: aiResult.tokens,
    });
  } catch (e) {
    console.error("ai-domain-model-analyzer error:", e);

    // Revert status on failure
    try {
      const { initiativeId } = await req.clone().json().catch(() => ({}));
      if (initiativeId) {
        await serviceClient
          .from("initiatives")
          .update({ stage_status: "db_provisioned" } as any)
          .eq("id", initiativeId);
      }
    } catch {}

    return errorResponse(e instanceof Error ? e.message : "Domain model analysis failed", 500);
  }
});

/** Fallback domain model based on generic SaaS patterns */
function generateFallbackModel(title: string, description: string) {
  return {
    entities: [
      {
        name: "users",
        attributes: [
          { name: "id", type: "uuid", primary_key: true, nullable: false, default: "gen_random_uuid()", description: "Primary key" },
          { name: "email", type: "text", primary_key: false, nullable: false, default: null, description: "User email" },
          { name: "name", type: "text", primary_key: false, nullable: true, default: null, description: "User display name" },
          { name: "created_at", type: "timestamp", primary_key: false, nullable: false, default: "now()", description: "Creation timestamp" },
        ],
        description: "System users",
      },
      {
        name: "settings",
        attributes: [
          { name: "id", type: "uuid", primary_key: true, nullable: false, default: "gen_random_uuid()", description: "Primary key" },
          { name: "key", type: "text", primary_key: false, nullable: false, default: null, description: "Setting key" },
          { name: "value", type: "jsonb", primary_key: false, nullable: true, default: null, description: "Setting value" },
          { name: "user_id", type: "uuid", primary_key: false, nullable: true, default: null, description: "Owner user" },
          { name: "created_at", type: "timestamp", primary_key: false, nullable: false, default: "now()", description: "Creation timestamp" },
        ],
        description: "Application settings",
      },
    ],
    relationships: [
      { from: "settings", to: "users", field: "user_id", type: "many_to_one", description: "Settings belong to a user" },
    ],
    business_rules: [
      { rule: "Each user must have a unique email", entities_involved: ["users"] },
    ],
  };
}
