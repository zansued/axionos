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

    const { data: initiative, error: initErr } = await serviceClient
      .from("initiatives")
      .select("id, title, description, organization_id")
      .eq("id", initiativeId)
      .single();
    if (initErr || !initiative) return errorResponse("Initiative not found", 404);

    // Update status
    await serviceClient
      .from("initiatives")
      .update({ stage_status: "generating_api" } as any)
      .eq("id", initiativeId);

    const { data: job } = await serviceClient
      .from("initiative_jobs")
      .insert({
        initiative_id: initiativeId,
        user_id: user.id,
        stage: "api_generation",
        status: "running",
      })
      .select("id")
      .single();

    const startTime = Date.now();

    // Load Project Brain nodes in parallel
    const [domainRes, dataRes, logicRes] = await Promise.all([
      serviceClient.from("project_brain_nodes").select("metadata")
        .eq("initiative_id", initiativeId).eq("node_type", "domain_model").maybeSingle(),
      serviceClient.from("project_brain_nodes").select("metadata")
        .eq("initiative_id", initiativeId).eq("node_type", "data_model").maybeSingle(),
      serviceClient.from("project_brain_nodes").select("metadata")
        .eq("initiative_id", initiativeId).eq("node_type", "business_logic").maybeSingle(),
    ]);

    const domainModel = domainRes.data?.metadata || null;
    const dataModel = dataRes.data?.metadata || null;
    const businessLogic = logicRes.data?.metadata || null;

    const systemPrompt = `You are an API Architect. Generate a complete API specification from the domain model, data model and business logic.

Return a valid JSON object:
{
  "endpoints": [
    {
      "method": "GET|POST|PATCH|DELETE",
      "path": "/api/v1/entity",
      "entity": "entity_name",
      "action": "list|get|create|update|delete|custom_action",
      "description": "what this endpoint does",
      "auth_required": true,
      "request_body": { "field": "type" } | null,
      "response": { "field": "type" },
      "query_params": ["param1"] | null
    }
  ],
  "rpc_functions": [
    {
      "name": "function_name",
      "description": "what this function does",
      "params": [{ "name": "param", "type": "uuid|text|jsonb|integer|boolean|timestamp" }],
      "returns": "type description",
      "security": "definer|invoker",
      "entity": "related_entity"
    }
  ],
  "event_triggers": [
    {
      "name": "trigger_name",
      "table": "table_name",
      "event": "INSERT|UPDATE|DELETE",
      "timing": "AFTER|BEFORE",
      "description": "what this trigger does",
      "function_name": "handler_function"
    }
  ],
  "webhooks": [
    {
      "event": "event_name",
      "description": "when this webhook fires",
      "payload_fields": ["field1","field2"],
      "entity": "related_entity"
    }
  ]
}

Rules:
- Every entity MUST have standard CRUD endpoints (list, get, create, update, delete)
- Add custom action endpoints from business_logic services
- RPC functions for complex operations that span multiple tables
- Event triggers for audit logging, notifications, and workflow transitions
- Webhooks for external integration points
- All endpoints require authentication by default
- Use RESTful conventions: plural nouns, proper HTTP methods
- Include pagination params (limit, offset) for list endpoints`;

    const domainSummary = domainModel?.entities
      ? JSON.stringify(domainModel.entities, null, 2).slice(0, 3000)
      : "No domain model";
    const logicSummary = businessLogic?.services
      ? JSON.stringify(businessLogic.services, null, 2).slice(0, 3000)
      : "No business logic";
    const workflowSummary = businessLogic?.workflows
      ? JSON.stringify(businessLogic.workflows, null, 2).slice(0, 1500)
      : "";
    const dataSummary = dataModel
      ? JSON.stringify(dataModel, null, 2).slice(0, 2000)
      : "No data model";

    const userPrompt = `Generate the complete API specification for:

PROJECT: ${initiative.title}
DESCRIPTION: ${initiative.description || "N/A"}

DOMAIN MODEL ENTITIES:
${domainSummary}

DATA MODEL:
${dataSummary}

BUSINESS LOGIC SERVICES:
${logicSummary}
${workflowSummary ? `\nWORKFLOWS:\n${workflowSummary}` : ""}

Generate all REST endpoints, RPC functions, event triggers and webhooks.`;

    const aiResult = await callAI("", systemPrompt, userPrompt, true, 3, false);

    // Parse
    let apiSpec: any;
    try {
      apiSpec = JSON.parse(aiResult.content);
    } catch {
      const jsonMatch = aiResult.content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        apiSpec = JSON.parse(jsonMatch[1].trim());
      } else {
        throw new Error("Failed to parse API spec from AI response");
      }
    }

    // Validate: ensure every entity has at least one CRUD endpoint
    const entityNames = domainModel?.entities?.map((e: any) => e.name) || [];
    const endpointEntities = new Set((apiSpec.endpoints || []).map((ep: any) => ep.entity));

    for (const entityName of entityNames) {
      if (!endpointEntities.has(entityName)) {
        apiSpec.endpoints = apiSpec.endpoints || [];
        const basePath = `/api/v1/${entityName}`;
        apiSpec.endpoints.push(
          { method: "GET", path: basePath, entity: entityName, action: "list", description: `List all ${entityName}`, auth_required: true, request_body: null, response: { items: "array" }, query_params: ["limit", "offset"] },
          { method: "GET", path: `${basePath}/{id}`, entity: entityName, action: "get", description: `Get ${entityName} by ID`, auth_required: true, request_body: null, response: { item: "object" }, query_params: null },
          { method: "POST", path: basePath, entity: entityName, action: "create", description: `Create ${entityName}`, auth_required: true, request_body: { fields: "object" }, response: { id: "uuid" }, query_params: null },
          { method: "PATCH", path: `${basePath}/{id}`, entity: entityName, action: "update", description: `Update ${entityName}`, auth_required: true, request_body: { fields: "object" }, response: { success: "boolean" }, query_params: null },
          { method: "DELETE", path: `${basePath}/{id}`, entity: entityName, action: "delete", description: `Delete ${entityName}`, auth_required: true, request_body: null, response: { success: "boolean" }, query_params: null },
        );
      }
    }

    // Report
    const report = {
      entities_exposed: new Set((apiSpec.endpoints || []).map((ep: any) => ep.entity)).size,
      endpoints_created: apiSpec.endpoints?.length || 0,
      rpc_functions: apiSpec.rpc_functions?.length || 0,
      event_triggers: apiSpec.event_triggers?.length || 0,
      webhooks_created: apiSpec.webhooks?.length || 0,
    };

    // Store in Project Brain
    await Promise.all([
      serviceClient.from("project_brain_nodes").upsert(
        {
          initiative_id: initiativeId,
          organization_id: initiative.organization_id,
          node_type: "api_spec",
          name: "API Specification",
          status: "active",
          metadata: {
            ...apiSpec,
            report,
            generated_at: new Date().toISOString(),
            model_used: aiResult.model,
            tokens_used: aiResult.tokens,
          },
        },
        { onConflict: "initiative_id,node_type,name" }
      ),
      serviceClient.from("project_brain_nodes").upsert(
        {
          initiative_id: initiativeId,
          organization_id: initiative.organization_id,
          node_type: "api_generation_report",
          name: "API Generation Report",
          status: "active",
          metadata: report,
        },
        { onConflict: "initiative_id,node_type,name" }
      ),
    ]);

    const durationMs = Date.now() - startTime;

    if (job) {
      await serviceClient
        .from("initiative_jobs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          duration_ms: durationMs,
          cost_usd: aiResult.costUsd,
          model: aiResult.model,
          outputs: { api_spec: apiSpec, report },
        })
        .eq("id", job.id);
    }

    await serviceClient
      .from("initiatives")
      .update({ stage_status: "api_generated" } as any)
      .eq("id", initiativeId);

    return jsonResponse({
      success: true,
      ...report,
      duration_ms: durationMs,
      model_used: aiResult.model,
      tokens_used: aiResult.tokens,
    });
  } catch (e) {
    console.error("autonomous-api-generator error:", e);
    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body.initiativeId) {
        await serviceClient
          .from("initiatives")
          .update({ stage_status: "logic_synthesized" } as any)
          .eq("id", body.initiativeId);
      }
    } catch {}
    return errorResponse(e instanceof Error ? e.message : "API generation failed", 500);
  }
});
