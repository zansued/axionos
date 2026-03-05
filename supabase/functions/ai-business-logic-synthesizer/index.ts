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
      .select("id, title, description, organization_id")
      .eq("id", initiativeId)
      .single();
    if (initErr || !initiative) return errorResponse("Initiative not found", 404);

    // 2. Update status
    await serviceClient
      .from("initiatives")
      .update({ stage_status: "synthesizing_logic" } as any)
      .eq("id", initiativeId);

    const { data: job } = await serviceClient
      .from("initiative_jobs")
      .insert({
        initiative_id: initiativeId,
        user_id: user.id,
        stage: "business_logic_synthesis",
        status: "running",
      })
      .select("id")
      .single();

    const startTime = Date.now();

    // 3. Load domain_model from Project Brain
    const { data: domainNode } = await serviceClient
      .from("project_brain_nodes")
      .select("metadata")
      .eq("initiative_id", initiativeId)
      .eq("node_type", "domain_model")
      .maybeSingle();

    // 4. Load data_model from Project Brain
    const { data: dataNode } = await serviceClient
      .from("project_brain_nodes")
      .select("metadata")
      .eq("initiative_id", initiativeId)
      .eq("node_type", "data_model")
      .maybeSingle();

    const domainModel = domainNode?.metadata || null;
    const dataModel = dataNode?.metadata || null;

    if (!domainModel && !dataModel) {
      // Fallback: generate CRUD from initiative description
      console.warn("No domain/data model found, generating from description");
    }

    // 5. Call LLM
    const systemPrompt = `You are a Business Logic Architect. Generate comprehensive business logic from the domain model and data model provided.

Return a valid JSON object with this exact structure:
{
  "services": [
    {
      "entity": "entity_name",
      "actions": [
        { "name": "action_name", "type": "create|read|update|delete|custom", "description": "what this action does", "inputs": ["field1","field2"], "outputs": ["field1"], "requires_auth": true }
      ]
    }
  ],
  "validations": [
    { "rule": "description of validation rule", "entity": "entity_name", "field": "field_name_or_null", "type": "required|format|range|reference|custom", "error_message": "user-facing error" }
  ],
  "workflows": [
    { "entity": "entity_name", "field": "status_field", "states": ["state1","state2"], "transitions": [{"from":"state1","to":"state2","action":"action_name","conditions":["condition"]}] }
  ],
  "access_control": [
    { "entity": "entity_name", "role": "role_name", "permissions": ["select","insert","update","delete"], "condition": "RLS condition description" }
  ],
  "computed_fields": [
    { "entity": "entity_name", "field": "field_name", "formula": "calculation description", "triggers": ["on_insert","on_update"] }
  ]
}

Rules:
- Every entity MUST have at least one service with CRUD actions
- Add custom actions for domain-specific operations (e.g. send_invoice, cancel_order)
- Infer workflow states from entity semantics (e.g. orders have lifecycle states)
- Generate RLS-compatible access control rules
- Include validation rules for all foreign keys, required fields, and business constraints
- Be thorough and practical`;

    const entitySummary = domainModel?.entities
      ? JSON.stringify(domainModel.entities, null, 2).slice(0, 4000)
      : "No domain model available";

    const dataSummary = dataModel
      ? JSON.stringify(dataModel, null, 2).slice(0, 4000)
      : "No data model available";

    const userPrompt = `Generate business logic for this project:

PROJECT: ${initiative.title}
DESCRIPTION: ${initiative.description || "N/A"}

DOMAIN MODEL:
${entitySummary}

DATA MODEL:
${dataSummary}

${domainModel?.relationships ? `\nRELATIONSHIPS:\n${JSON.stringify(domainModel.relationships, null, 2).slice(0, 2000)}` : ""}
${domainModel?.business_rules ? `\nBUSINESS RULES:\n${JSON.stringify(domainModel.business_rules, null, 2).slice(0, 1000)}` : ""}

Generate complete services, validations, workflows and access control for ALL entities.`;

    const aiResult = await callAI("", systemPrompt, userPrompt, true, 3, false);

    // 6. Parse result
    let businessLogic: any;
    try {
      businessLogic = JSON.parse(aiResult.content);
    } catch {
      const jsonMatch = aiResult.content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        businessLogic = JSON.parse(jsonMatch[1].trim());
      } else {
        throw new Error("Failed to parse business logic from AI response");
      }
    }

    // 7. Validate: every entity has at least one service
    const entityNames = domainModel?.entities?.map((e: any) => e.name) || [];
    const servicedEntities = new Set(businessLogic.services?.map((s: any) => s.entity) || []);
    
    for (const entityName of entityNames) {
      if (!servicedEntities.has(entityName)) {
        // Add fallback CRUD service
        businessLogic.services = businessLogic.services || [];
        businessLogic.services.push({
          entity: entityName,
          actions: [
            { name: `create_${entityName}`, type: "create", description: `Create a new ${entityName}`, inputs: [], outputs: ["id"], requires_auth: true },
            { name: `update_${entityName}`, type: "update", description: `Update an existing ${entityName}`, inputs: ["id"], outputs: [], requires_auth: true },
            { name: `delete_${entityName}`, type: "delete", description: `Delete a ${entityName}`, inputs: ["id"], outputs: [], requires_auth: true },
            { name: `list_${entityName}`, type: "read", description: `List all ${entityName}`, inputs: [], outputs: [], requires_auth: true },
          ],
        });
      }
    }

    // 8. Build report
    const totalActions = (businessLogic.services || []).reduce(
      (sum: number, s: any) => sum + (s.actions?.length || 0), 0
    );
    const report = {
      services_generated: businessLogic.services?.length || 0,
      total_actions: totalActions,
      validation_rules: businessLogic.validations?.length || 0,
      workflow_states: (businessLogic.workflows || []).reduce(
        (sum: number, w: any) => sum + (w.states?.length || 0), 0
      ),
      workflows_count: businessLogic.workflows?.length || 0,
      access_control_rules: businessLogic.access_control?.length || 0,
      computed_fields: businessLogic.computed_fields?.length || 0,
    };

    // 9. Store in Project Brain
    await serviceClient.from("project_brain_nodes").upsert(
      {
        initiative_id: initiativeId,
        organization_id: initiative.organization_id,
        node_type: "business_logic",
        name: "Business Logic",
        status: "active",
        metadata: {
          ...businessLogic,
          report,
          synthesized_at: new Date().toISOString(),
          model_used: aiResult.model,
          tokens_used: aiResult.tokens,
        },
      },
      { onConflict: "initiative_id,node_type,name" }
    );

    await serviceClient.from("project_brain_nodes").upsert(
      {
        initiative_id: initiativeId,
        organization_id: initiative.organization_id,
        node_type: "business_logic_report",
        name: "Business Logic Report",
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
          outputs: { business_logic: businessLogic, report },
        })
        .eq("id", job.id);
    }

    // 11. Update status
    await serviceClient
      .from("initiatives")
      .update({ stage_status: "logic_synthesized" } as any)
      .eq("id", initiativeId);

    return jsonResponse({
      success: true,
      ...report,
      duration_ms: durationMs,
      model_used: aiResult.model,
      tokens_used: aiResult.tokens,
    });
  } catch (e) {
    console.error("ai-business-logic-synthesizer error:", e);
    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body.initiativeId) {
        await serviceClient
          .from("initiatives")
          .update({ stage_status: "domain_analyzed" } as any)
          .eq("id", body.initiativeId);
      }
    } catch {}
    return errorResponse(e instanceof Error ? e.message : "Business logic synthesis failed", 500);
  }
});
