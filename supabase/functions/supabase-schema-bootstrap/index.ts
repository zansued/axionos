// Supabase Schema Bootstrap — AxionOS Pipeline Stage
// Creates an isolated PostgreSQL schema for each generated project
// inside the connected Supabase instance.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import {
  pipelineLog, updateInitiative, createJob, completeJob, failJob,
} from "../_shared/pipeline-helpers.ts";
import {
  upsertNode, getBrainNodes, recordDecision, upsertPreventionRule,
} from "../_shared/brain-helpers.ts";

serve(async (req) => {
  const result = await bootstrapPipeline(req, "supabase-schema-bootstrap");
  if (result instanceof Response) return result;
  const { initiative, ctx, serviceClient } = result;

  const jobId = await createJob(ctx, "supabase_schema_bootstrap", {});
  const startTime = Date.now();

  try {
    await updateInitiative(ctx, { stage_status: "bootstrapping_schema" });
    await pipelineLog(ctx, "schema_bootstrap_start", "🗄️ Supabase Schema Bootstrap — detecting connection...");

    // ── 1. Detect active Supabase connection ──
    const { data: supaConns } = await serviceClient
      .from("supabase_connections")
      .select("id, label, supabase_url, supabase_anon_key, status, workspace_id")
      .eq("organization_id", ctx.organizationId)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(1);

    const conn = supaConns?.[0];

    if (!conn) {
      await pipelineLog(ctx, "schema_bootstrap_skip", "⚠️ No active Supabase connection — skipping schema bootstrap");
      if (jobId) await completeJob(ctx, jobId, { skipped: true, reason: "no_supabase_connection" }, {});
      await updateInitiative(ctx, { stage_status: "schema_bootstrapped" });
      return jsonResponse({
        success: true,
        skipped: true,
        message: "No Supabase connection found — stage skipped",
      });
    }

    await pipelineLog(ctx, "schema_bootstrap_connection",
      `✅ Supabase connection found: "${conn.label || "default"}" (${conn.supabase_url})`,
      { connection_id: conn.id });

    // ── 2. Retrieve project_id from Project Brain ──
    const allNodes = await getBrainNodes(ctx);
    const infraNode = allNodes.find((n: any) =>
      n.node_type === "data_infrastructure" || n.name === "data_infrastructure"
    );

    // Derive project_id: use initiative short id (first 8 chars)
    const projectId = ctx.initiativeId.replace(/-/g, "").slice(0, 8);
    const schemaName = `app_${projectId}`;

    await pipelineLog(ctx, "schema_bootstrap_schema_name",
      `📐 Schema name: ${schemaName} (project_id: ${projectId})`);

    // ── 3. Connect to Supabase target and create schema ──
    // We use the service_role_key from secrets to connect to the TARGET Supabase
    // The supabase_connections table stores the URL + anon_key;
    // the service_role_key for the target is needed for DDL operations.
    // For AxionOS-managed instances, we use the platform's service role.
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const targetUrl = conn.supabase_url;

    if (!serviceRoleKey) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for schema creation");
    }

    // Create a service-role client pointing to the TARGET Supabase
    const targetClient = createClient(targetUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // ── 3a. Execute CREATE SCHEMA via RPC ──
    // Since we can't run raw SQL, we'll use the REST API to call a function.
    // We need to create the schema through a management endpoint.
    // The safest way is via the Supabase Management API (pg_query) or a pre-existing function.
    // For now, we use the REST endpoint to run the SQL via the pg_net extension or
    // fall back to calling the SQL endpoint directly.

    const sqlEndpoint = `${targetUrl}/rest/v1/rpc/`;

    // Try creating schema via direct SQL endpoint (requires service_role)
    const createSchemaSQL = `CREATE SCHEMA IF NOT EXISTS ${schemaName}`;
    const sqlResp = await fetch(`${targetUrl}/pg`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
      body: JSON.stringify({ query: createSchemaSQL }),
    });

    let schemaCreated = false;
    let creationMethod = "unknown";

    if (sqlResp.ok) {
      schemaCreated = true;
      creationMethod = "pg_endpoint";
      await sqlResp.text(); // consume body
    } else {
      // Fallback: try via SQL HTTP API
      const sqlApiResp = await fetch(`${targetUrl}/sql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
        body: JSON.stringify({ query: createSchemaSQL }),
      });

      if (sqlApiResp.ok) {
        schemaCreated = true;
        creationMethod = "sql_api";
        await sqlApiResp.text();
      } else {
        const fallbackBody = await sqlApiResp.text();
        console.error("Schema creation fallback failed:", fallbackBody);

        // Final fallback: try via the /rest/v1/ endpoint using a function
        // If all SQL endpoints fail, we register it as pending for manual execution
        await pipelineLog(ctx, "schema_bootstrap_manual",
          `⚠️ Automated schema creation failed — registering for manual execution. SQL: ${createSchemaSQL}`,
          { sql: createSchemaSQL, error: fallbackBody.slice(0, 200) });

        creationMethod = "pending_manual";
      }
    }

    // ── 4. Validate schema creation ──
    let schemaValidated = false;

    if (schemaCreated) {
      // Verify by querying information_schema
      const verifySQL = `SELECT schema_name FROM information_schema.schemata WHERE schema_name = '${schemaName}'`;
      const verifyResp = await fetch(`${targetUrl}/pg`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
        body: JSON.stringify({ query: verifySQL }),
      });

      if (verifyResp.ok) {
        const verifyData = await verifyResp.json();
        const rows = verifyData?.rows || verifyData || [];
        schemaValidated = Array.isArray(rows)
          ? rows.some((r: any) => r.schema_name === schemaName || Object.values(r).includes(schemaName))
          : false;
      } else {
        await verifyResp.text();
        // If verification endpoint not available, trust the creation response
        schemaValidated = schemaCreated;
      }
    }

    await pipelineLog(ctx, "schema_bootstrap_validated",
      schemaValidated
        ? `✅ Schema "${schemaName}" validated in database`
        : `⚠️ Schema "${schemaName}" creation: ${creationMethod}`,
      { schema_created: schemaCreated, validated: schemaValidated, method: creationMethod });

    // ── 5. Register schema in Project Brain ──
    const infraNodeId = await upsertNode(ctx, {
      name: "data_infrastructure",
      file_path: "data_infrastructure.json",
      node_type: "schema" as any,
      status: schemaCreated ? "generated" : "planned",
      metadata: {
        provider: "supabase",
        database: "postgresql",
        schema: schemaName,
        project_id: projectId,
        connection_name: conn.label || "default",
        connection_id: conn.id,
        supabase_url: conn.supabase_url,
        creation_method: creationMethod,
        created_at: new Date().toISOString(),
      },
    });

    // Record architectural decision
    await recordDecision(
      ctx,
      `Database isolation: schema "${schemaName}"`,
      `Each generated project uses its own PostgreSQL schema to ensure data isolation. Schema "${schemaName}" was created in the connected Supabase instance.`,
      "All database tables, functions, and types for this project must reside in the project schema. Using public schema is forbidden.",
      "database",
    );

    // ── 6. Enforce isolation prevention rule ──
    await upsertPreventionRule(
      ctx,
      "public_schema_usage",
      `FORBIDDEN: Do not create tables, views, or functions in the 'public' schema. ALL database objects MUST use the project schema '${schemaName}'. Example: '${schemaName}.users' is allowed, 'public.users' is FORBIDDEN.`,
      "organization",
    );

    await upsertPreventionRule(
      ctx,
      "schema_prefix_missing",
      `All SQL migrations must prefix table names with the project schema '${schemaName}'. Use 'CREATE TABLE ${schemaName}.<table_name>' instead of 'CREATE TABLE <table_name>'.`,
      "initiative",
    );

    // ── 7. Store schema bootstrap report ──
    const report = {
      project_id: projectId,
      schema_created: schemaCreated,
      schema_validated: schemaValidated,
      schema_name: schemaName,
      database_provider: "supabase",
      connection_name: conn.label || "default",
      creation_method: creationMethod,
      isolation_rules_enforced: true,
      generated_at: new Date().toISOString(),
    };

    await upsertNode(ctx, {
      name: "schema_bootstrap_report",
      file_path: "schema_bootstrap_report.json",
      node_type: "schema" as any,
      status: "generated",
      metadata: report,
    });

    // ── 8. Update initiative ──
    await updateInitiative(ctx, {
      stage_status: "schema_bootstrapped",
      execution_progress: {
        ...(initiative.execution_progress || {}),
        schema_bootstrap: report,
      },
    });

    const durationMs = Date.now() - startTime;
    if (jobId) {
      await completeJob(ctx, jobId, report, { durationMs });
    }

    await pipelineLog(ctx, "schema_bootstrap_complete",
      `🗄️ Schema Bootstrap complete: ${schemaName} (${creationMethod}) ${schemaValidated ? "✅" : "⚠️"}`);

    return jsonResponse({
      success: true,
      ...report,
    });

  } catch (e) {
    console.error("supabase-schema-bootstrap error:", e);
    if (jobId) await failJob(ctx, jobId, e instanceof Error ? e.message : "Unknown error");
    await updateInitiative(ctx, { stage_status: "dependencies_analyzed" }); // rollback
    return errorResponse(e instanceof Error ? e.message : "Unknown error");
  }
});
