import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.1";
import { getCorsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { callAI } from "../_shared/ai-client.ts";

const SYSTEM_PROMPT = `
You are AxionOS Action Engine, an elite autonomous product creator.
Your goal is to transform user ideas into governed, executable actions.

## Protocolo de Geração (Bolt-Style)
Sempre que precisar criar ou modificar arquivos/infraestrutura, use a estrutura de artefatos:

1. Use <boltArtifact id="project-id" title="Project Title"> para encapsular as mudanças.
2. Use <boltAction type="file" filePath="path/to/file.ts"> para conteúdo de arquivos. Forneça o conteúdo INTEGRAL, sem placeholders.
3. Use <boltAction type="shell"> para comandos de terminal (ex: npm install, npx shadcn-ui add).

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

    // 2. Parse Bolt-Style Artifacts using Regex
    const actions: any[] = [];
    
    // Extract boltArtifacts
    const artifactRegex = /<boltArtifact\s+id="([^"]+)"\s+title="([^"]+)">([\s\S]*?)<\/boltArtifact>/g;
    let artifactMatch;

    while ((artifactMatch = artifactRegex.exec(content)) !== null) {
      const [_, artifactId, title, artifactBody] = artifactMatch;
      
      // Extract boltActions within artifact
      const actionRegex = /<boltAction\s+type="([^"]+)"(?:\s+filePath="([^"]+)")?>([\s\S]*?)<\/boltAction>/g;
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

        const { data, error } = await supabaseClient
          .from("action_registry_entries")
          .insert({
            organization_id: orgId || "global",
            trigger_type: `bolt_${action.type}`,
            initiative_id: initiativeId,
            stage: stage,
            execution_mode: "auto",
            status: "queued",
            risk_level: action.type === "shell" ? "high" : "low",
            description,
            reason: "Bolt-style artifact formalization",
            payload: {
              artifactId: action.artifactId,
              artifactTitle: action.artifactTitle,
              type: action.type,
              filePath: action.filePath,
              content: action.content
            }
          })
          .select()
          .single();

        if (error) console.error("[ActionEngine] Error inserting action:", error);
        return data;
      })
    );

    return jsonResponse({
      message: "Actions formalized via Bolt-AIOS Bridge",
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
