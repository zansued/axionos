import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import {
  getBrainNodes, getBrainEdges, getDecisions, getRecentErrors,
  upsertNode, addEdge, recordDecision, recordError, searchNodes,
  generateBrainContext, getPreventionRules,
} from "../_shared/brain-helpers.ts";

serve(async (req) => {
  const result = await bootstrapPipeline(req, "brain-sync");
  if (result instanceof Response) return result;
  const { ctx, body } = result;

  const action = body.action;
  if (!action) return errorResponse("action is required", 400);

  try {
    switch (action) {
      // ── READ ──
      case "get_nodes": {
        const nodes = await getBrainNodes(ctx, body.node_type);
        return jsonResponse({ nodes });
      }
      case "get_edges": {
        const edges = await getBrainEdges(ctx);
        return jsonResponse({ edges });
      }
      case "get_decisions": {
        const decisions = await getDecisions(ctx, body.category);
        return jsonResponse({ decisions });
      }
      case "get_errors": {
        const errors = await getRecentErrors(ctx, body.limit || 20);
        return jsonResponse({ errors });
      }
      case "search": {
        if (!body.query) return errorResponse("query is required", 400);
        const results = await searchNodes(ctx, body.query);
        return jsonResponse({ results });
      }
      case "get_context": {
        const context = await generateBrainContext(ctx);
        return jsonResponse({ context });
      }
      case "get_prevention_rules": {
        const rules = await getPreventionRules(ctx);
        return jsonResponse({ rules });
      }

      // ── WRITE ──
      case "upsert_node": {
        if (!body.node) return errorResponse("node is required", 400);
        const id = await upsertNode(ctx, body.node);
        return jsonResponse({ id });
      }
      case "upsert_nodes": {
        if (!body.nodes?.length) return errorResponse("nodes array is required", 400);
        const ids: string[] = [];
        for (const node of body.nodes) {
          ids.push(await upsertNode(ctx, node));
        }
        return jsonResponse({ ids });
      }
      case "add_edge": {
        if (!body.edge) return errorResponse("edge is required", 400);
        await addEdge(ctx, body.edge);
        return jsonResponse({ success: true });
      }
      case "add_edges": {
        if (!body.edges?.length) return errorResponse("edges array is required", 400);
        for (const edge of body.edges) {
          await addEdge(ctx, edge);
        }
        return jsonResponse({ success: true, count: body.edges.length });
      }
      case "record_decision": {
        if (!body.decision || !body.reason) return errorResponse("decision and reason are required", 400);
        const id = await recordDecision(ctx, body.decision, body.reason, body.impact, body.category, body.agent_id);
        return jsonResponse({ id });
      }
      case "record_error": {
        if (!body.error_message) return errorResponse("error_message is required", 400);
        const id = await recordError(ctx, body.error_message, body.error_type, body.file_path, body.root_cause, body.prevention_rule);
        return jsonResponse({ id });
      }

      default:
        return errorResponse(`Unknown action: ${action}`, 400);
    }
  } catch (e) {
    console.error("brain-sync error:", e);
    return errorResponse(e instanceof Error ? e.message : "Unknown error");
  }
});
