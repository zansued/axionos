import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { action, organization_id, constitution_id, memory_asset_id, class_id } = await req.json();
    const json = (d: any) => new Response(JSON.stringify(d), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (action === "overview") {
      const [constitutions, classes, assets, lossEvents] = await Promise.all([
        supabase.from("institutional_memory_constitutions").select("*").eq("organization_id", organization_id),
        supabase.from("memory_asset_classes").select("*").eq("organization_id", organization_id),
        supabase.from("institutional_memory_assets").select("*").eq("organization_id", organization_id),
        supabase.from("memory_loss_events").select("*").eq("organization_id", organization_id).is("resolved_at", null),
      ]);

      const assetData = assets.data || [];
      const classData = classes.data || [];
      const lossData = lossEvents.data || [];

      const classDist: Record<string, number> = {};
      for (const c of classData) classDist[c.class_type] = 0;
      for (const a of assetData) {
        const cls = classData.find((c: any) => c.id === a.memory_class_id);
        if (cls) classDist[cls.class_type] = (classDist[cls.class_type] || 0) + 1;
      }

      const protectedCount = assetData.filter((a: any) => a.current_status === "protected" || a.precedent_weight >= 0.7).length;
      const expiringSoon = assetData.filter((a: any) => {
        if (!a.retention_deadline) return false;
        const days = (new Date(a.retention_deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        return days > 0 && days < 30;
      }).length;

      return json({
        stats: {
          total_constitutions: (constitutions.data || []).length,
          active_constitutions: (constitutions.data || []).filter((c: any) => c.constitution_status === "active").length,
          total_classes: classData.length,
          total_assets: assetData.length,
          protected_precedents: protectedCount,
          expiring_soon: expiringSoon,
          unresolved_loss_events: lossData.length,
          class_distribution: classDist,
        },
      });
    }

    if (action === "constitutions") {
      const { data } = await supabase.from("institutional_memory_constitutions").select("*").eq("organization_id", organization_id);
      return json({ constitutions: data });
    }

    if (action === "memory_assets") {
      let q = supabase.from("institutional_memory_assets").select("*").eq("organization_id", organization_id);
      if (class_id) q = q.eq("memory_class_id", class_id);
      const { data } = await q.order("precedent_weight", { ascending: false }).limit(100);
      return json({ assets: data });
    }

    if (action === "classify") {
      const { data: classes } = await supabase.from("memory_asset_classes").select("*").eq("organization_id", organization_id).eq("active", true);
      return json({ classes });
    }

    if (action === "retention_policies") {
      let q = supabase.from("memory_retention_policies").select("*").eq("organization_id", organization_id);
      if (constitution_id) q = q.eq("constitution_id", constitution_id);
      const { data } = await q;
      return json({ policies: data });
    }

    if (action === "reconstruction_paths") {
      let q = supabase.from("memory_reconstruction_paths").select("*").eq("organization_id", organization_id);
      if (memory_asset_id) q = q.eq("memory_asset_id", memory_asset_id);
      const { data } = await q;
      return json({ paths: data });
    }

    if (action === "loss_events") {
      const { data } = await supabase.from("memory_loss_events").select("*").eq("organization_id", organization_id).order("created_at", { ascending: false });
      return json({ events: data });
    }

    if (action === "recommendations") {
      const [{ data: assets }, { data: lossEvents }, { data: classes }] = await Promise.all([
        supabase.from("institutional_memory_assets").select("*").eq("organization_id", organization_id),
        supabase.from("memory_loss_events").select("*").eq("organization_id", organization_id).is("resolved_at", null),
        supabase.from("memory_asset_classes").select("*").eq("organization_id", organization_id),
      ]);

      const recs: any[] = [];
      const assetArr = assets || [];
      const lossArr = lossEvents || [];

      if (lossArr.length > 0) recs.push({ priority: "critical", title: `${lossArr.length} unresolved memory loss events`, description: "Institutional memory may be degrading. Review loss events immediately." });

      const noClass = assetArr.filter((a: any) => !a.memory_class_id);
      if (noClass.length > 0) recs.push({ priority: "high", title: `${noClass.length} unclassified memory assets`, description: "Memory assets without class assignment cannot be governed properly." });

      const expiring = assetArr.filter((a: any) => {
        if (!a.retention_deadline) return false;
        const days = (new Date(a.retention_deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        return days > 0 && days < 30;
      });
      if (expiring.length > 0) recs.push({ priority: "medium", title: `${expiring.length} memory assets expiring within 30 days`, description: "Review retention deadlines and decide on archival or renewal." });

      if (recs.length === 0) recs.push({ priority: "low", title: "Institutional memory posture is healthy", description: "No critical gaps detected." });

      return json({ recommendations: recs });
    }

    if (action === "explain" && memory_asset_id) {
      const [{ data: asset }, { data: paths }, { data: losses }] = await Promise.all([
        supabase.from("institutional_memory_assets").select("*").eq("id", memory_asset_id).single(),
        supabase.from("memory_reconstruction_paths").select("*").eq("memory_asset_id", memory_asset_id),
        supabase.from("memory_loss_events").select("*").eq("memory_asset_id", memory_asset_id),
      ]);

      let memoryClass = null;
      if (asset?.memory_class_id) {
        const { data: cls } = await supabase.from("memory_asset_classes").select("*").eq("id", asset.memory_class_id).single();
        memoryClass = cls;
      }

      return json({ asset, memory_class: memoryClass, reconstruction_paths: paths, loss_events: losses });
    }

    return json({ error: "Unknown action" });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
