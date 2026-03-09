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
      .update({ stage_status: "generating_data_model" } as any)
      .eq("id", initiativeId);

    // 3. Load domain_model from Project Brain
    const { data: domainNode } = await serviceClient
      .from("project_brain_nodes")
      .select("id, metadata")
      .eq("initiative_id", initiativeId)
      .eq("node_type", "domain_model")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const domainModel = domainNode?.metadata || { entities: [], relationships: [] };

    // 4. Generate data model via AI
    const prompt = `You are a Supabase Data Architect.
Given the following domain model, generate a complete relational database schema.

Domain Model:
${JSON.stringify(domainModel, null, 2)}

Project: ${initiative.title}
Description: ${initiative.description || "N/A"}

Generate a JSON response with this exact structure:
{
  "tables": [
    {
      "name": "table_name",
      "columns": [
        { "name": "id", "type": "uuid", "primary_key": true, "default": "gen_random_uuid()" },
        { "name": "column_name", "type": "text|integer|boolean|timestamp|uuid|numeric|jsonb", "nullable": true/false, "default": "value_or_null", "references": { "table": "other_table", "column": "id" } }
      ],
      "indexes": ["column_name"],
      "rls_enabled": true
    }
  ],
  "rls_policies": [
    {
      "table": "table_name",
      "name": "policy_name",
      "command": "SELECT|INSERT|UPDATE|DELETE|ALL",
      "using": "SQL expression",
      "with_check": "SQL expression or null"
    }
  ],
  "sql_migrations": ["CREATE TABLE ... ;"]
}

Requirements:
- Every table must have id (uuid PK), created_at, updated_at
- Use proper foreign keys for relationships
- Enable RLS on all tables
- Create isolation policies (users access own records, admins access all)
- Use snake_case for all names
- Include proper indexes for foreign keys and frequently queried columns
- Tables should be in public schema with project prefix consideration`;

    let dataModel: any;
    try {
      const aiResult = await callAI({
        model: "deepseek-chat",
        prompt,
        serviceClient,
        initiativeId,
        stage: "data_model_generation",
        userId: user.id,
        expectJson: true,
      });
      dataModel = typeof aiResult === "string" ? JSON.parse(aiResult) : aiResult;
    } catch (aiErr) {
      console.error("AI generation failed, using fallback:", aiErr);
      dataModel = generateFallbackDataModel(domainModel);
    }

    // 5. Validate: ensure every entity has a table
    const entityNames: string[] = (domainModel.entities || []).map((e: any) =>
      typeof e === "string" ? e.toLowerCase() : (e.name || "").toLowerCase()
    );
    const tableNames = new Set((dataModel.tables || []).map((t: any) => t.name?.toLowerCase()));

    for (const entityName of entityNames) {
      if (!tableNames.has(entityName)) {
        dataModel.tables = dataModel.tables || [];
        dataModel.tables.push({
          name: entityName,
          columns: [
            { name: "id", type: "uuid", primary_key: true, default: "gen_random_uuid()" },
            { name: "name", type: "text", nullable: false },
            { name: "created_at", type: "timestamp with time zone", nullable: false, default: "now()" },
            { name: "updated_at", type: "timestamp with time zone", nullable: false, default: "now()" },
          ],
          indexes: [],
          rls_enabled: true,
        });
      }
    }

    // 6. Store data_model node in Project Brain
    const orgId = initiative.organization_id;
    await serviceClient.from("project_brain_nodes").upsert(
      {
        initiative_id: initiativeId,
        organization_id: orgId,
        name: "data_model",
        node_type: "data_model",
        file_path: "brain://data_model",
        status: "generated",
        metadata: dataModel,
      },
      { onConflict: "initiative_id,node_type,name" }
    );

    // 7. Store report
    const report = {
      tables_generated: dataModel.tables?.length || 0,
      total_columns: (dataModel.tables || []).reduce((sum: number, t: any) => sum + (t.columns?.length || 0), 0),
      rls_policies: dataModel.rls_policies?.length || 0,
      indexes_created: (dataModel.tables || []).reduce((sum: number, t: any) => sum + (t.indexes?.length || 0), 0),
      sql_migrations: dataModel.sql_migrations?.length || 0,
    };

    await serviceClient.from("project_brain_nodes").upsert(
      {
        initiative_id: initiativeId,
        organization_id: orgId,
        name: "data_model_report",
        node_type: "report",
        file_path: "brain://data_model_report",
        status: "generated",
        metadata: report,
      },
      { onConflict: "initiative_id,node_type,name" }
    );

    // 8. Update status
    await serviceClient
      .from("initiatives")
      .update({ stage_status: "data_model_generated" } as any)
      .eq("id", initiativeId);

    return jsonResponse({
      success: true,
      tables_generated: report.tables_generated,
      total_columns: report.total_columns,
      rls_policies: report.rls_policies,
      indexes_created: report.indexes_created,
    });
  } catch (err: any) {
    console.error("supabase-data-model-generator error:", err);
    return errorResponse(err.message || "Internal error", 500);
  }
});

function generateFallbackDataModel(domainModel: any) {
  const entities: string[] = (domainModel.entities || []).map((e: any) =>
    typeof e === "string" ? e.toLowerCase() : (e.name || "").toLowerCase()
  );
  const tables = entities.map((name) => ({
    name,
    columns: [
      { name: "id", type: "uuid", primary_key: true, default: "gen_random_uuid()" },
      { name: "name", type: "text", nullable: false },
      { name: "description", type: "text", nullable: true },
      { name: "status", type: "text", nullable: false, default: "'active'" },
      { name: "user_id", type: "uuid", nullable: false },
      { name: "created_at", type: "timestamp with time zone", nullable: false, default: "now()" },
      { name: "updated_at", type: "timestamp with time zone", nullable: false, default: "now()" },
    ],
    indexes: ["user_id"],
    rls_enabled: true,
  }));

  return { tables, rls_policies: [], sql_migrations: [] };
}
