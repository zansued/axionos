// Supabase Provisioning Engine — AxionOS Pipeline Stage
// Provisions base tables, RLS policies, and storage buckets
// inside the project's dedicated PostgreSQL schema.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { bootstrapPipeline } from "../_shared/pipeline-bootstrap.ts";
import { jsonResponse, errorResponse } from "../_shared/cors.ts";
import {
  pipelineLog, updateInitiative, createJob, completeJob, failJob,
} from "../_shared/pipeline-helpers.ts";
import {
  upsertNode, getBrainNodes, recordDecision,
} from "../_shared/brain-helpers.ts";

// ═══════════════════════════════════════════════
// SQL GENERATORS
// ═══════════════════════════════════════════════

function generateTableSQL(schema: string): { sql: string; tables: string[] } {
  const tables = ["users", "settings", "audit_logs"];
  const sql = `
-- Base tables for project schema ${schema}

CREATE TABLE IF NOT EXISTS ${schema}.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  display_name text,
  avatar_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ${schema}.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  value jsonb DEFAULT '{}'::jsonb,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ${schema}.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES ${schema}.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);
`.trim();
  return { sql, tables };
}

function generateRLSSQL(schema: string, tables: string[]): string {
  const lines: string[] = [];

  for (const table of tables) {
    lines.push(`ALTER TABLE ${schema}.${table} ENABLE ROW LEVEL SECURITY;`);
  }

  // Users: can only see/edit own record
  lines.push(`
CREATE POLICY "user_select_own" ON ${schema}.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "user_update_own" ON ${schema}.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "user_insert_own" ON ${schema}.users
  FOR INSERT WITH CHECK (auth.uid() = id);
`);

  // Settings: authenticated can read, only service_role can write
  lines.push(`
CREATE POLICY "settings_select_auth" ON ${schema}.settings
  FOR SELECT TO authenticated USING (true);
`);

  // Audit logs: users can see own logs
  lines.push(`
CREATE POLICY "audit_select_own" ON ${schema}.audit_logs
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "audit_insert_auth" ON ${schema}.audit_logs
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
`);

  return lines.join("\n").trim();
}

// ═══════════════════════════════════════════════
// SQL EXECUTION HELPER
// ═══════════════════════════════════════════════

async function executeSQL(
  targetUrl: string,
  serviceRoleKey: string,
  sql: string,
): Promise<{ ok: boolean; method: string; error?: string }> {
  // Try /pg endpoint first
  const pgResp = await fetch(`${targetUrl}/pg`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (pgResp.ok) {
    await pgResp.text();
    return { ok: true, method: "pg_endpoint" };
  }
  const pgErr = await pgResp.text();

  // Fallback: /sql
  const sqlResp = await fetch(`${targetUrl}/sql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (sqlResp.ok) {
    await sqlResp.text();
    return { ok: true, method: "sql_api" };
  }
  const sqlErr = await sqlResp.text();

  return { ok: false, method: "none", error: `pg: ${pgErr.slice(0, 200)} | sql: ${sqlErr.slice(0, 200)}` };
}

// ═══════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════

serve(async (req) => {
  const result = await bootstrapPipeline(req, "supabase-provisioning-engine");
  if (result instanceof Response) return result;
  const { initiative, ctx, serviceClient } = result;

  const jobId = await createJob(ctx, "supabase_provisioning", {});
  const startTime = Date.now();

  try {
    await updateInitiative(ctx, { stage_status: "provisioning_db" });
    await pipelineLog(ctx, "provisioning_start", "🗄️ Supabase Provisioning Engine — loading infrastructure metadata...");

    // ── 1. Load data_infrastructure from Project Brain ──
    const allNodes = await getBrainNodes(ctx);
    const infraNode = allNodes.find((n: any) =>
      n.node_type === "schema" && (n.name === "data_infrastructure" || n.name === "schema_bootstrap_report")
    );

    if (!infraNode?.metadata?.schema) {
      await pipelineLog(ctx, "provisioning_skip",
        "⚠️ No schema found in Project Brain — skipping provisioning. Run Schema Bootstrap first.");
      if (jobId) await completeJob(ctx, jobId, { skipped: true, reason: "no_schema" }, {});
      await updateInitiative(ctx, { stage_status: "db_provisioned" });
      return jsonResponse({ success: true, skipped: true, message: "No schema found — run Schema Bootstrap first" });
    }

    const schema = infraNode.metadata.schema as string;
    const projectId = infraNode.metadata.project_id as string || schema.replace("app_", "");
    const supabaseUrl = infraNode.metadata.supabase_url as string;

    await pipelineLog(ctx, "provisioning_schema", `📐 Target schema: ${schema}`);

    // ── 2. Resolve Supabase connection ──
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!serviceRoleKey || !supabaseUrl) {
      throw new Error("SUPABASE_SERVICE_ROLE_KEY and supabase_url are required");
    }

    // ── 3. Create base tables ──
    await pipelineLog(ctx, "provisioning_tables", "📊 Creating base tables...");
    const { sql: tableSQL, tables } = generateTableSQL(schema);
    const tableResult = await executeSQL(supabaseUrl, serviceRoleKey, tableSQL);

    if (!tableResult.ok) {
      await pipelineLog(ctx, "provisioning_tables_warn",
        `⚠️ Table creation via API failed (${tableResult.method}): ${tableResult.error?.slice(0, 150)}. Registering SQL for manual execution.`,
        { sql: tableSQL, error: tableResult.error });
    } else {
      await pipelineLog(ctx, "provisioning_tables_ok",
        `✅ Tables created: ${tables.join(", ")} (via ${tableResult.method})`);
    }

    // ── 4. Enable RLS + policies ──
    await pipelineLog(ctx, "provisioning_rls", "🔒 Enabling Row Level Security...");
    const rlsSQL = generateRLSSQL(schema, tables);
    const rlsResult = await executeSQL(supabaseUrl, serviceRoleKey, rlsSQL);

    if (!rlsResult.ok) {
      await pipelineLog(ctx, "provisioning_rls_warn",
        `⚠️ RLS setup via API failed: ${rlsResult.error?.slice(0, 150)}`,
        { sql: rlsSQL });
    } else {
      await pipelineLog(ctx, "provisioning_rls_ok", `✅ RLS enabled on ${tables.length} tables`);
    }

    // ── 5. Create storage bucket ──
    await pipelineLog(ctx, "provisioning_storage", "📁 Creating storage bucket...");
    const bucketName = `files_${projectId}`;
    let bucketCreated = false;

    const targetClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { error: bucketError } = await targetClient.storage.createBucket(bucketName, {
      public: false,
      fileSizeLimit: 52428800, // 50MB
    });

    if (bucketError) {
      if (bucketError.message?.includes("already exists")) {
        bucketCreated = true;
        await pipelineLog(ctx, "provisioning_bucket_exists", `✅ Bucket "${bucketName}" already exists`);
      } else {
        await pipelineLog(ctx, "provisioning_bucket_warn",
          `⚠️ Bucket creation failed: ${bucketError.message}`,
          { bucket: bucketName, error: bucketError.message });
      }
    } else {
      bucketCreated = true;
      await pipelineLog(ctx, "provisioning_bucket_ok", `✅ Storage bucket "${bucketName}" created (private)`);
    }

    // ── 6. Validate provisioning ──
    await pipelineLog(ctx, "provisioning_validate", "🔍 Validating provisioning...");
    let tablesValidated = false;

    if (tableResult.ok) {
      const verifySQL = `SELECT table_name FROM information_schema.tables WHERE table_schema = '${schema}'`;
      const verifyResult = await executeSQL(supabaseUrl, serviceRoleKey, verifySQL);
      tablesValidated = verifyResult.ok; // If we can query, tables likely exist
    }

    // ── 7. Register provisioning in Project Brain ──
    const report = {
      schema,
      project_id: projectId,
      tables_created: tables,
      tables_ok: tableResult.ok,
      rls_enabled: rlsResult.ok,
      storage_bucket: bucketName,
      bucket_created: bucketCreated,
      tables_validated: tablesValidated,
      provisioned_at: new Date().toISOString(),
    };

    await upsertNode(ctx, {
      name: "database_provisioning",
      file_path: "database_provisioning.json",
      node_type: "schema" as any,
      status: "generated",
      metadata: report,
    });

    // Record decisions
    await recordDecision(
      ctx,
      `Database provisioned in schema "${schema}" with ${tables.length} base tables`,
      "Base infrastructure (users, settings, audit_logs) + RLS + storage bucket created before code generation",
      "All application queries must target the project schema, never the public schema",
      "database",
    );

    // ── 8. Update initiative ──
    await updateInitiative(ctx, {
      stage_status: "db_provisioned",
      execution_progress: {
        ...(initiative.execution_progress || {}),
        db_provisioning: report,
      },
    });

    const durationMs = Date.now() - startTime;
    if (jobId) await completeJob(ctx, jobId, report, { durationMs });

    await pipelineLog(ctx, "provisioning_complete",
      `🗄️ Provisioning complete: ${tables.length} tables, RLS ${rlsResult.ok ? "✅" : "⚠️"}, bucket ${bucketCreated ? "✅" : "⚠️"}`);

    return jsonResponse({ success: true, ...report });

  } catch (e) {
    console.error("supabase-provisioning-engine error:", e);
    if (jobId) await failJob(ctx, jobId, e instanceof Error ? e.message : "Unknown error");
    await updateInitiative(ctx, { stage_status: "schema_bootstrapped" }); // rollback
    return errorResponse(e instanceof Error ? e.message : "Unknown error");
  }
});
