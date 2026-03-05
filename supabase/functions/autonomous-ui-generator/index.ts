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
      .update({ stage_status: "generating_ui" } as any)
      .eq("id", initiativeId);

    // 3. Load context from Project Brain
    const { data: brainNodes } = await serviceClient
      .from("project_brain_nodes")
      .select("name, node_type, metadata")
      .eq("initiative_id", initiativeId)
      .in("node_type", ["domain_model", "business_logic", "api_spec", "data_model"]);

    const contextMap: Record<string, any> = {};
    for (const node of brainNodes || []) {
      contextMap[node.node_type] = node.metadata;
    }

    const domainModel = contextMap.domain_model || { entities: [] };
    const businessLogic = contextMap.business_logic || { services: [] };
    const apiSpec = contextMap.api_spec || { endpoints: [] };
    const dataModel = contextMap.data_model || { tables: [] };

    // 4. Generate UI structure via AI
    const prompt = `You are a Senior Frontend Architect specializing in React + Vite + Tailwind CSS + shadcn/ui.

Given the following project context, generate a complete UI structure for a production-ready application.

Project: ${initiative.title}
Description: ${initiative.description || "N/A"}

Domain Model:
${JSON.stringify(domainModel, null, 2)}

Business Logic:
${JSON.stringify(businessLogic, null, 2)}

API Spec:
${JSON.stringify(apiSpec, null, 2)}

Data Model:
${JSON.stringify(dataModel, null, 2)}

Generate a JSON response with this exact structure:
{
  "pages": [
    {
      "name": "PageName",
      "path": "/route-path",
      "file_path": "src/pages/PageName.tsx",
      "description": "What this page does",
      "components": ["ComponentA", "ComponentB"],
      "data_sources": ["entity_name"],
      "features": ["list", "create", "edit", "delete", "filter", "search"]
    }
  ],
  "components": [
    {
      "name": "ComponentName",
      "file_path": "src/components/feature/ComponentName.tsx",
      "type": "table|form|card|dialog|filter|dashboard|layout|chart",
      "entity": "entity_name",
      "props": [{ "name": "propName", "type": "TypeName" }],
      "uses_hooks": ["useQuery", "useMutation"],
      "description": "What this component does"
    }
  ],
  "hooks": [
    {
      "name": "useEntityName",
      "file_path": "src/hooks/useEntityName.ts",
      "entity": "entity_name",
      "operations": ["list", "create", "update", "delete"]
    }
  ],
  "navigation": {
    "sidebar": [
      { "label": "Dashboard", "path": "/", "icon": "LayoutDashboard" },
      { "label": "Entity Name", "path": "/entities", "icon": "IconName" }
    ]
  },
  "layouts": [
    {
      "name": "AppLayout",
      "file_path": "src/components/layout/AppLayout.tsx",
      "includes": ["sidebar", "header", "main_content"]
    }
  ]
}

Requirements:
- Generate a Dashboard page as the default route
- Generate CRUD pages for each main entity
- Use shadcn/ui components (Table, Dialog, Form, Card, Button, Input, Select, etc.)
- Create reusable data hooks for each entity using TanStack React Query + Supabase client
- Include proper navigation with sidebar
- Use Tailwind CSS for styling with semantic design tokens
- Include search, filter, and sort capabilities on list pages
- Include form validation using react-hook-form + zod
- Generate responsive layouts (mobile-first)`;

    let uiStructure: any;
    try {
      const aiResult = await callAI({
        model: "google/gemini-2.5-flash",
        prompt,
        serviceClient,
        initiativeId,
        stage: "ui_generation",
        userId: user.id,
        expectJson: true,
      });
      uiStructure = typeof aiResult === "string" ? JSON.parse(aiResult) : aiResult;
    } catch (aiErr) {
      console.error("AI UI generation failed, using fallback:", aiErr);
      uiStructure = generateFallbackUI(domainModel);
    }

    // 5. Validate: ensure every entity has at least one page
    const entityNames: string[] = (domainModel.entities || []).map((e: any) =>
      typeof e === "string" ? e.toLowerCase() : (e.name || "").toLowerCase()
    );
    const pageEntities = new Set(
      (uiStructure.pages || []).flatMap((p: any) => (p.data_sources || []).map((s: string) => s.toLowerCase()))
    );

    for (const entityName of entityNames) {
      if (!pageEntities.has(entityName)) {
        const pascalName = entityName.charAt(0).toUpperCase() + entityName.slice(1);
        uiStructure.pages = uiStructure.pages || [];
        uiStructure.pages.push({
          name: `${pascalName}Page`,
          path: `/${entityName}s`,
          file_path: `src/pages/${pascalName}s.tsx`,
          description: `CRUD page for ${entityName}`,
          components: [`${pascalName}Table`, `${pascalName}Form`],
          data_sources: [entityName],
          features: ["list", "create", "edit", "delete"],
        });
      }
    }

    // 6. Store ui_structure node in Project Brain
    const orgId = initiative.organization_id;
    await serviceClient.from("project_brain_nodes").upsert(
      {
        initiative_id: initiativeId,
        organization_id: orgId,
        name: "ui_structure",
        node_type: "ui_structure",
        file_path: "brain://ui_structure",
        status: "generated",
        metadata: uiStructure,
      },
      { onConflict: "initiative_id,node_type,name" }
    );

    // 7. Store report
    const report = {
      pages_generated: uiStructure.pages?.length || 0,
      components_generated: uiStructure.components?.length || 0,
      hooks_generated: uiStructure.hooks?.length || 0,
      navigation_items: uiStructure.navigation?.sidebar?.length || 0,
      layouts_generated: uiStructure.layouts?.length || 0,
    };

    await serviceClient.from("project_brain_nodes").upsert(
      {
        initiative_id: initiativeId,
        organization_id: orgId,
        name: "ui_generation_report",
        node_type: "report",
        file_path: "brain://ui_generation_report",
        status: "generated",
        metadata: report,
      },
      { onConflict: "initiative_id,node_type,name" }
    );

    // 8. Create brain nodes for each generated page/component
    const pageNodes = (uiStructure.pages || []).map((p: any) => ({
      initiative_id: initiativeId,
      organization_id: orgId,
      name: p.name,
      node_type: "page",
      file_path: p.file_path,
      status: "planned",
      metadata: { description: p.description, features: p.features, components: p.components },
    }));

    const componentNodes = (uiStructure.components || []).map((c: any) => ({
      initiative_id: initiativeId,
      organization_id: orgId,
      name: c.name,
      node_type: "component",
      file_path: c.file_path,
      status: "planned",
      metadata: { type: c.type, entity: c.entity, props: c.props, description: c.description },
    }));

    if (pageNodes.length > 0) {
      await serviceClient.from("project_brain_nodes").upsert(pageNodes, {
        onConflict: "initiative_id,node_type,name",
      });
    }
    if (componentNodes.length > 0) {
      await serviceClient.from("project_brain_nodes").upsert(componentNodes, {
        onConflict: "initiative_id,node_type,name",
      });
    }

    // 9. Update status
    await serviceClient
      .from("initiatives")
      .update({ stage_status: "ui_generated" } as any)
      .eq("id", initiativeId);

    return jsonResponse({
      success: true,
      pages_generated: report.pages_generated,
      components_generated: report.components_generated,
      hooks_generated: report.hooks_generated,
      navigation_items: report.navigation_items,
    });
  } catch (err: any) {
    console.error("autonomous-ui-generator error:", err);
    return errorResponse(err.message || "Internal error", 500);
  }
});

function generateFallbackUI(domainModel: any) {
  const entities: string[] = (domainModel.entities || []).map((e: any) =>
    typeof e === "string" ? e : e.name || "item"
  );

  const pages = [
    {
      name: "Dashboard",
      path: "/",
      file_path: "src/pages/Dashboard.tsx",
      description: "Main dashboard with KPIs and overview",
      components: ["KPICards", "RecentActivity"],
      data_sources: entities,
      features: ["overview", "stats"],
    },
    ...entities.map((entity) => {
      const pascal = entity.charAt(0).toUpperCase() + entity.slice(1);
      return {
        name: `${pascal}Page`,
        path: `/${entity}s`,
        file_path: `src/pages/${pascal}s.tsx`,
        description: `CRUD management for ${entity}`,
        components: [`${pascal}Table`, `${pascal}Form`, `${pascal}Dialog`],
        data_sources: [entity],
        features: ["list", "create", "edit", "delete", "search"],
      };
    }),
  ];

  const components = entities.flatMap((entity) => {
    const pascal = entity.charAt(0).toUpperCase() + entity.slice(1);
    return [
      { name: `${pascal}Table`, file_path: `src/components/${entity}/${pascal}Table.tsx`, type: "table", entity, props: [], uses_hooks: ["useQuery"], description: `Data table for ${entity}` },
      { name: `${pascal}Form`, file_path: `src/components/${entity}/${pascal}Form.tsx`, type: "form", entity, props: [], uses_hooks: ["useMutation"], description: `Create/edit form for ${entity}` },
    ];
  });

  const hooks = entities.map((entity) => ({
    name: `use${entity.charAt(0).toUpperCase() + entity.slice(1)}`,
    file_path: `src/hooks/use${entity.charAt(0).toUpperCase() + entity.slice(1)}.ts`,
    entity,
    operations: ["list", "create", "update", "delete"],
  }));

  return {
    pages,
    components,
    hooks,
    navigation: {
      sidebar: [
        { label: "Dashboard", path: "/", icon: "LayoutDashboard" },
        ...entities.map((e) => ({ label: e.charAt(0).toUpperCase() + e.slice(1), path: `/${e}s`, icon: "FileText" })),
      ],
    },
    layouts: [{ name: "AppLayout", file_path: "src/components/layout/AppLayout.tsx", includes: ["sidebar", "header", "main_content"] }],
  };
}
