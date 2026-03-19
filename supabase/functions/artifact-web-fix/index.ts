import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * artifact-web-fix: Agente especializado que pesquisa soluções na web
 * e aplica contexto enriquecido para corrigir artefatos escalados.
 * 
 * Fluxo:
 * 1. Carrega o artefato e suas revisões (para entender os problemas)
 * 2. Extrai o erro/bloqueio principal
 * 3. Pesquisa na web usando Lovable AI para obter contexto técnico
 * 4. Aplica correção com contexto enriquecido
 * 5. Atualiza o artefato com a correção
 */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const client = createClient(supabaseUrl, serviceKey);

    const { artifact_id, initiative_id } = await req.json();
    if (!artifact_id) {
      return new Response(JSON.stringify({ error: "artifact_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Load artifact
    const { data: artifact, error: artErr } = await client
      .from("agent_outputs")
      .select("*")
      .eq("id", artifact_id)
      .single();
    if (artErr || !artifact) {
      return new Response(JSON.stringify({ error: "Artifact not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Load last reviews to understand the problem
    const { data: reviews } = await client
      .from("artifact_reviews")
      .select("action, comment")
      .eq("output_id", artifact_id)
      .order("created_at", { ascending: false })
      .limit(5);

    const reviewContext = (reviews || [])
      .map((r: any) => `[${r.action}] ${r.comment}`)
      .join("\n");

    // 3. Extract artifact content and error
    const artifactText = extractText(artifact.raw_output);
    const errorPattern = extractErrorPattern(reviewContext, artifactText);

    // 4. Load project context: other approved artifacts for type reference
    let projectContext = "";
    if (initiative_id) {
      const { data: approvedArtifacts } = await client
        .from("agent_outputs")
        .select("summary, raw_output, type")
        .eq("initiative_id", initiative_id)
        .eq("status", "approved")
        .limit(10);

      if (approvedArtifacts && approvedArtifacts.length > 0) {
        // Extract imports, types, and interfaces from approved artifacts
        const typeSnippets = approvedArtifacts
          .filter((a: any) => a.type === "code")
          .map((a: any) => {
            const text = extractText(a.raw_output);
            // Extract import statements and type/interface definitions
            const lines = text.split("\n");
            const relevantLines = lines.filter((l: string) =>
              l.startsWith("import ") ||
              l.startsWith("export interface") ||
              l.startsWith("export type") ||
              l.startsWith("export const") ||
              l.includes("createClient") ||
              l.includes("supabase")
            );
            return relevantLines.length > 0
              ? `// From: ${a.summary}\n${relevantLines.slice(0, 15).join("\n")}`
              : null;
          })
          .filter(Boolean)
          .join("\n\n");

        if (typeSnippets) {
          projectContext = `\n## Project Context (approved artifacts)\n${typeSnippets.slice(0, 3000)}`;
        }
      }
    }

    // 5. Use Lovable AI to research the error and generate fix
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step A: Research the problem
    const researchResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a senior TypeScript/Deno developer. Research and provide the correct implementation for a coding issue.
Focus on:
- Correct Supabase client API usage (createClient from @supabase/supabase-js)
- Correct Deno imports and patterns
- TypeScript type safety
- Edge Function patterns (serve, Response, headers)

Provide ONLY the technical solution — correct code patterns, correct types, correct imports.
Be specific and cite the actual API signatures.`,
          },
          {
            role: "user",
            content: `Error/Issue: ${errorPattern}

Artifact summary: ${artifact.summary || "N/A"}
Artifact type: ${artifact.type}

Review history:
${reviewContext}

Current code (first 2000 chars):
${artifactText.slice(0, 2000)}
${projectContext}

What is the correct implementation? Provide the exact code patterns needed.`,
          },
        ],
      }),
    });

    if (!researchResponse.ok) {
      const errText = await researchResponse.text();
      console.error("AI research failed:", researchResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI research failed", status: researchResponse.status }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const researchData = await researchResponse.json();
    const researchInsight = researchData.choices?.[0]?.message?.content || "";

    // Step B: Apply fix with enriched context
    const fixResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a Fix Agent with web-researched context. Apply the researched solution to fix this artifact.
Return ONLY the complete corrected code/content. No markdown wrapping, no explanation — just the fixed artifact.

Key rules:
- Use correct Supabase imports: import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
- For Edge Functions: use serve() from std/http, return Response objects
- Apply CORS headers correctly
- Use Deno.env.get() for secrets
- Do NOT define custom SupabaseClient interfaces — use the SDK's types`,
          },
          {
            role: "user",
            content: `## Research Findings
${researchInsight.slice(0, 3000)}

## Original Artifact
${artifactText.slice(0, 5000)}

## Known Issues
${reviewContext}
${projectContext}

Return the COMPLETE corrected artifact.`,
          },
        ],
      }),
    });

    if (!fixResponse.ok) {
      const errText = await fixResponse.text();
      console.error("AI fix failed:", fixResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI fix failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fixData = await fixResponse.json();
    let fixedContent = fixData.choices?.[0]?.message?.content || "";
    fixedContent = fixedContent.replace(/^```[\w]*\n?/, "").replace(/\n?```\s*$/, "").trim();

    if (!fixedContent || fixedContent.length < 50) {
      return new Response(JSON.stringify({ error: "Fix Agent produced insufficient output" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 6. Update artifact
    const isCode = artifact.type === "code";
    const newRawOutput = isCode
      ? { ...(typeof artifact.raw_output === "object" ? artifact.raw_output : {}), content: fixedContent, text: fixedContent }
      : { text: fixedContent };

    await client.from("agent_outputs").update({
      raw_output: newRawOutput,
      status: "pending_review", // Keep in review for human verification
      updated_at: new Date().toISOString(),
    }).eq("id", artifact_id);

    // Record the web-fix review
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();

    await client.from("artifact_reviews").insert({
      output_id: artifact_id,
      reviewer_id: user?.id || "system",
      action: "web_research_fix",
      previous_status: artifact.status,
      new_status: "pending_review",
      comment: `Correção via pesquisa web (Lovable AI). Insight: ${researchInsight.slice(0, 200)}...`,
    });

    return new Response(JSON.stringify({
      success: true,
      message: "Artefato corrigido com pesquisa web. Revise e aprove.",
      research_summary: researchInsight.slice(0, 500),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("artifact-web-fix error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function extractText(raw: any): string {
  if (typeof raw === "string") return raw;
  if (typeof raw === "object") return raw?.text || raw?.content || JSON.stringify(raw);
  return String(raw);
}

function extractErrorPattern(reviewContext: string, artifactText: string): string {
  // Extract the most relevant error pattern from review comments
  const patterns = [
    /Interface '(\w+)' is incomplete/i,
    /Type '(\w+)' is not assignable/i,
    /Cannot find module/i,
    /Property '(\w+)' does not exist/i,
    /\[Types?\] .+/i,
    /\[security\] .+/i,
    /\[imports?\] .+/i,
  ];

  for (const pattern of patterns) {
    const match = reviewContext.match(pattern);
    if (match) return match[0];
  }

  // Fallback: first review comment
  const firstComment = reviewContext.split("\n")[0];
  if (firstComment && firstComment.length > 10) return firstComment;

  return "General code quality issues requiring fix";
}
