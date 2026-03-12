import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";
import { getCorsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";

const SYSTEM_PROMPT = `
You are AxionOS Action Engine, an elite autonomous product creator.
Your goal is to transform user ideas into governed, executable actions.

## Protocolo de Geração (Axion-style)
Sempre que precisar criar ou modificar arquivos/infraestrutura, use a estrutura de artefatos:

1. Use <axionArtifact id="project-id" title="Project Title"> para encapsular as mudanças.
2. Use <axionAction type="file" filePath="path/to/file.ts"> para conteúdo de arquivos. Forneça o conteúdo INTEGRAL, sem placeholders.
3. Use <axionAction type="shell"> para comandos de terminal (ex: npm install, npx shadcn-ui add).

## Governança AxionOS
Suas ações serão processadas pelo Agendador AIOS (Round Robin). 
Priorize segurança, tipos TypeScript e padrões de design modernos.
`;

serve(async (req) => {
  const corsRes = handleCors(req);
  if (corsRes) return corsRes;

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const body = await req.json();
    const { prompt, orgId, initiativeId, stage = "execution" } = body;

    if (!prompt) return errorResponse("Prompt is required", 400, req);

    // 1. Call AI with Efficiency Layer
    const aiResult = await callAI(
      Deno.env.get("OPENAI_API_KEY") || "",
      SYSTEM_PROMPT,
      prompt,
      false, // jsonMode
      3,     // retries
      true,  // usePro (Action Engine needs high quality)
      stage,
      orgId,
      initiativeId
    );

    const content = aiResult.content;

    // 2. Parse Axion-style Artifacts using Regex
    const actions: any[] = [];
    
    // Extract axionArtifacts
    const artifactRegex = /<axionArtifact\s+id="([^"]+)"\s+title="([^"]+)">([\s\S]*?)<\/axionArtifact>/g;
    let artifactMatch;

    while ((artifactMatch = artifactRegex.exec(content)) !== null) {
      const [_, artifactId, title, artifactBody] = artifactMatch;
      
      // Extract axionActions within artifact
      const actionRegex = /<axionAction\s+type="([^"]+)"(?:\s+filePath="([^"]+)")?>([\s\S]*?)<\/axionAction>/g;
      let actionMatch;

      while ((actionMatch = actionRegex.exec(artifactBody)) !== null) {
        const [__, type, filePath, actionContent] = actionMatch;
        
        actions.push({
          artifactId,
          artifactTitle: title,
          type,
          filePath,
          content: actionContent.trim(),
        });
      }
    }

    // 3. Formalize Actions in AxionOS Registry
    // This bridges Bolt Generation with AIOS/Axion Execution
    const formalizedActions = await Promise.all(
      actions.map(async (action) => {
        const description = action.type === "file" 
          ? `Create/Update file: ${action.filePath}`
          : `Execute shell command: ${action.content.substring(0, 50)}...`;

        const actionId = crypto.randomUUID();
        const intentId = crypto.randomUUID();
        const triggerId = crypto.randomUUID();

        // Guard: organization_id must be a valid UUID — "global" is not valid
        if (!orgId || orgId === "global") {
          console.warn("[ActionEngine] Skipping action — missing valid organization_id (UUID required)");
          return null;
        }

        const isShell = action.type === "shell";

        const { data, error } = await supabaseClient
          .from("action_registry_entries")
          .insert({
            action_id: actionId,
            intent_id: intentId,
            trigger_id: triggerId,
            organization_id: orgId,
            trigger_type: `bolt_${action.type}`,
            initiative_id: initiativeId || null,
            stage: stage,
            execution_mode: isShell ? "approval_required" : "auto",
            status: isShell ? "pending" : "queued",
            risk_level: isShell ? "high" : "low",
            requires_approval: isShell,
            rollback_available: action.type === "file",
            description,
            reason: "Axion Action Engine artifact formalization",
            payload: {
              artifactId: action.artifactId,
              artifactTitle: action.artifactTitle,
              type: action.type,
              filePath: action.filePath,
              content: action.content,
            },
          })
          .select()
          .single();

        if (error) console.error("[ActionEngine] Error inserting action:", error);
        return data;
      })
    );

    return jsonResponse({
      message: "Actions formalized via Axion-AIOS Bridge",
      ai_response: content,
      actions_count: actions.length,
      formalized_ids: formalizedActions.map(a => a?.id).filter(Boolean),
      efficiency: aiResult.efficiency
    }, 200, req);

  } catch (error) {
    console.error("[ActionEngine] Critical Error:", error);
    return errorResponse(error.message, 500, req);
  }
});

