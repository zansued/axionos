import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, ...params } = await req.json();

    switch (action) {
      case "register_capability": return await registerCapability(supabase, params);
      case "add_version": return await addVersion(supabase, params);
      case "list_capabilities": return await listCapabilities(supabase, params);
      case "capability_detail": return await capabilityDetail(supabase, params);
      case "update_capability_status": return await updateStatus(supabase, params);
      case "inspect_dependencies": return await inspectDependencies(supabase, params);
      case "explain_capability": return await explainCapability(supabase, params);
      default: return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (e) {
    return json({ error: e.message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function registerCapability(sb: any, p: any) {
  const { data: pkg, error: pkgErr } = await sb
    .from("capability_packages")
    .insert({
      organization_id: p.organization_id,
      registry_entry_id: p.registry_entry_id || null,
      name: p.name || "",
      slug: p.slug || "",
      category: p.category || "general",
      description: p.description || "",
      owner_ref: p.owner_ref || {},
      source_type: p.source_type || "internal",
      affected_surfaces: p.affected_surfaces || [],
      required_scopes: p.required_scopes || [],
      compatibility_posture: p.compatibility_posture || {},
      rollback_ready: p.rollback_ready || false,
      risk_posture: p.risk_posture || "low",
      lifecycle_status: "registered",
    })
    .select()
    .single();
  if (pkgErr) return json({ error: pkgErr.message }, 400);

  const { data: ver } = await sb
    .from("capability_package_versions")
    .insert({
      package_id: pkg.id,
      organization_id: p.organization_id,
      version_label: p.version_label || "0.1.0",
      changelog: p.changelog || "Initial registration",
      package_payload: p.package_payload || {},
    })
    .select()
    .single();

  await sb.from("capability_package_events").insert({
    package_id: pkg.id,
    organization_id: p.organization_id,
    event_type: "capability.registered",
    actor_ref: p.actor_ref || {},
    event_payload: { package_name: pkg.name, version: ver?.version_label },
  });

  return json({ package: pkg, version: ver });
}

async function addVersion(sb: any, p: any) {
  const { data, error } = await sb
    .from("capability_package_versions")
    .insert({
      package_id: p.package_id,
      organization_id: p.organization_id,
      version_label: p.version_label || "0.1.0",
      changelog: p.changelog || "",
      package_payload: p.package_payload || {},
      compatibility_notes: p.compatibility_notes || null,
      status: "draft",
    })
    .select()
    .single();
  if (error) return json({ error: error.message }, 400);
  return json({ version: data });
}

async function listCapabilities(sb: any, p: any) {
  let q = sb
    .from("capability_packages")
    .select("*")
    .eq("organization_id", p.organization_id)
    .order("created_at", { ascending: false })
    .limit(p.limit || 100);
  if (p.category) q = q.eq("category", p.category);
  if (p.lifecycle_status) q = q.eq("lifecycle_status", p.lifecycle_status);
  const { data, error } = await q;
  if (error) return json({ error: error.message }, 400);
  return json({ capabilities: data });
}

async function capabilityDetail(sb: any, p: any) {
  const [pkgRes, verRes, evtRes] = await Promise.all([
    sb.from("capability_packages").select("*").eq("id", p.package_id).single(),
    sb.from("capability_package_versions").select("*").eq("package_id", p.package_id).order("created_at", { ascending: false }),
    sb.from("capability_package_events").select("*").eq("package_id", p.package_id).order("created_at", { ascending: false }).limit(20),
  ]);
  return json({
    package: pkgRes.data,
    versions: verRes.data || [],
    events: evtRes.data || [],
  });
}

async function updateStatus(sb: any, p: any) {
  const updates: any = { updated_at: new Date().toISOString() };
  if (p.lifecycle_status) updates.lifecycle_status = p.lifecycle_status;
  const { error } = await sb.from("capability_packages").update(updates).eq("id", p.package_id);
  if (error) return json({ error: error.message }, 400);
  return json({ ok: true });
}

async function inspectDependencies(sb: any, p: any) {
  const { data } = await sb
    .from("capability_packages")
    .select("compatibility_posture")
    .eq("id", p.package_id)
    .single();
  return json({ compatibility: data?.compatibility_posture || {} });
}

async function explainCapability(sb: any, p: any) {
  const { data: pkg } = await sb
    .from("capability_packages")
    .select("*")
    .eq("id", p.package_id)
    .single();
  if (!pkg) return json({ error: "Package not found" }, 404);

  return json({
    name: pkg.name,
    category: pkg.category,
    description: pkg.description,
    source_type: pkg.source_type,
    affected_surfaces: pkg.affected_surfaces,
    required_scopes: pkg.required_scopes,
    compatibility_posture: pkg.compatibility_posture,
    rollback_ready: pkg.rollback_ready,
    risk_posture: pkg.risk_posture,
    lifecycle_status: pkg.lifecycle_status,
  });
}
