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

    const projectDescription = (descNode?.metadata as any)?.description
      || initiative.refined_idea
      || initiative.description
      || initiative.idea_raw
      || initiative.title;

    // 4. Multi-attempt domain analysis with progressive simplification
    let domainModel: any = null;
    let aiResult: any = null;
    let attemptUsed = 0;

    const attempts = [
      { label: "full", maxEntities: null, simplified: false },
      { label: "simplified", maxEntities: 10, simplified: true },
      { label: "minimal", maxEntities: 6, simplified: true },
    ];

    for (let i = 0; i < attempts.length; i++) {
      const attempt = attempts[i];
      attemptUsed = i + 1;
      console.log(`[domain-analyzer] Attempt ${attemptUsed}/${attempts.length}: ${attempt.label}`);

      try {
        const { systemPrompt, userPrompt } = buildPrompts(
          initiative,
          projectDescription,
          attempt.maxEntities,
          attempt.simplified,
        );

        aiResult = await callAI("", systemPrompt, userPrompt, true, 3, false);
        domainModel = parseAIResponse(aiResult.content);

        if (domainModel && domainModel.entities && domainModel.entities.length > 0) {
          console.log(`[domain-analyzer] Success on attempt ${attemptUsed}: ${domainModel.entities.length} entities`);
          break;
        }
        domainModel = null;
      } catch (parseErr) {
        console.warn(`[domain-analyzer] Attempt ${attemptUsed} failed:`, parseErr.message);
        domainModel = null;
      }
    }

    // Final fallback: use deterministic model
    if (!domainModel || !domainModel.entities || domainModel.entities.length === 0) {
      console.warn("[domain-analyzer] All AI attempts failed, using fallback model");
      domainModel = generateFallbackModel(initiative.title, projectDescription);
      attemptUsed = -1;
    }

    // 5. Ensure all entities have required attributes
    for (const entity of domainModel.entities) {
      if (!entity.attributes) entity.attributes = [];
      const hasId = entity.attributes.some((a: any) => a.name === "id");
      if (!hasId) {
        entity.attributes.unshift({
          name: "id", type: "uuid", primary_key: true, nullable: false,
          default: "gen_random_uuid()", description: "Primary key",
        });
      }
      const hasCreatedAt = entity.attributes.some((a: any) => a.name === "created_at");
      if (!hasCreatedAt) {
        entity.attributes.push({
          name: "created_at", type: "timestamp", primary_key: false, nullable: false,
          default: "now()", description: "Creation timestamp",
        });
      }
    }

    // 6. Build report
    const totalAttributes = domainModel.entities.reduce(
      (sum: number, e: any) => sum + (e.attributes?.length || 0), 0
    );
    const report = {
      entities_detected: domainModel.entities.length,
      relationships_detected: domainModel.relationships?.length || 0,
      attributes_detected: totalAttributes,
      business_rules_detected: domainModel.business_rules?.length || 0,
      entity_names: domainModel.entities.map((e: any) => e.name),
      attempt_used: attemptUsed,
      fallback_used: attemptUsed === -1,
    };

    // 7. Store domain_model node in Project Brain
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
          model_used: aiResult?.model || "fallback",
          tokens_used: aiResult?.tokens || 0,
        },
      },
      { onConflict: "initiative_id,node_type,name" }
    );

    // 8. Also store the report node
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

    // 9. Update job
    if (job) {
      await serviceClient
        .from("initiative_jobs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          duration_ms: durationMs,
          cost_usd: aiResult?.costUsd || 0,
          model: aiResult?.model || "fallback",
          outputs: { domain_model: domainModel, report },
        })
        .eq("id", job.id);
    }

    // 10. Update initiative status → domain_analyzed
    await serviceClient
      .from("initiatives")
      .update({ stage_status: "domain_analyzed" } as any)
      .eq("id", initiativeId);

    return jsonResponse({
      success: true,
      ...report,
      duration_ms: durationMs,
      model_used: aiResult?.model || "fallback",
      tokens_used: aiResult?.tokens || 0,
    });
  } catch (e) {
    console.error("ai-domain-model-analyzer error:", e);

    // Revert status on failure
    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body?.initiativeId) {
        await serviceClient
          .from("initiatives")
          .update({ stage_status: "db_provisioned" } as any)
          .eq("id", body.initiativeId);
      }
    } catch {}

    return errorResponse(e instanceof Error ? e.message : "Domain model analysis failed", 500);
  }
});

/** Build prompts with progressive simplification */
function buildPrompts(
  initiative: any,
  projectDescription: string,
  maxEntities: number | null,
  simplified: boolean,
) {
  const entityLimit = maxEntities ? `\n- Generate at most ${maxEntities} entities (focus on the most important ones)` : "";
  const simplifiedNote = simplified
    ? `\n- Keep attributes minimal: only id, created_at, and 2-4 domain-specific attributes per entity\n- Keep relationships simple\n- Limit business rules to 3`
    : "";

  const systemPrompt = `You are a Domain Model Architect. Analyze the project and extract a structured domain model.

IMPORTANT: Return ONLY a raw JSON object. No markdown, no code blocks, no explanation.

The JSON must have this structure:
{
  "entities": [
    {
      "name": "entity_name_snake_case",
      "attributes": [
        { "name": "attribute_name", "type": "uuid|text|integer|boolean|timestamp|jsonb|numeric|text[]", "primary_key": false, "nullable": true, "default": null, "description": "brief" }
      ],
      "description": "What this entity represents"
    }
  ],
  "relationships": [
    { "from": "source", "to": "target", "field": "fk_field", "type": "many_to_one|one_to_one|many_to_many", "description": "desc" }
  ],
  "business_rules": [
    { "rule": "description", "entities_involved": ["entity1"] }
  ]
}

Rules:
- Every entity must have "id" (uuid, primary key, default gen_random_uuid())
- Every entity must have "created_at" (timestamp, default now())
- Use snake_case for all names${entityLimit}${simplifiedNote}

Return ONLY valid JSON. No other text.`;

  // Truncate context more aggressively in simplified mode
  const archSlice = simplified ? 800 : 2000;
  const discSlice = simplified ? 500 : 2000;

  const userPrompt = `Extract the domain model for:

PROJECT: ${initiative.title}
DESCRIPTION: ${(projectDescription || "").slice(0, simplified ? 1000 : 3000)}
${initiative.architecture_content ? `\nARCHITECTURE:\n${initiative.architecture_content.slice(0, archSlice)}` : ""}
${initiative.discovery_payload ? `\nCONTEXT:\n${JSON.stringify(initiative.discovery_payload).slice(0, discSlice)}` : ""}

Return ONLY the JSON object.`;

  return { systemPrompt, userPrompt };
}

/** Robust JSON parser with multiple extraction strategies */
function parseAIResponse(content: string): any {
  if (!content || typeof content !== "string") return null;

  // Strategy 1: Direct parse
  try {
    return JSON.parse(content.trim());
  } catch {}

  // Strategy 2: Extract from markdown code blocks
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {}
  }

  // Strategy 3: Find first { to last }
  const firstBrace = content.indexOf("{");
  const lastBrace = content.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(content.slice(firstBrace, lastBrace + 1));
    } catch {}
  }

  // Strategy 4: Try to fix common issues (trailing commas, single quotes)
  try {
    let cleaned = content.slice(
      Math.max(0, content.indexOf("{")),
      content.lastIndexOf("}") + 1
    );
    cleaned = cleaned.replace(/,\s*([}\]])/g, "$1"); // trailing commas
    return JSON.parse(cleaned);
  } catch {}

  return null;
}

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
