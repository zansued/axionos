import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();
    if (!prompt) {
      return new Response(JSON.stringify({ error: "prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const POLLINATIONS_API_KEY = Deno.env.get("POLLINATIONS_API_KEY");

    const encodedPrompt = encodeURIComponent(prompt);
    const url = `https://gen.pollinations.ai/image/${encodedPrompt}`;

    const headers: Record<string, string> = {};
    if (POLLINATIONS_API_KEY) {
      headers["Authorization"] = `Bearer ${POLLINATIONS_API_KEY}`;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const text = await response.text();
      console.error("Pollinations error:", response.status, text);
      return new Response(JSON.stringify({ error: "Image generation failed", status: response.status }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < uint8.length; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    const base64 = btoa(binary);

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const dataUrl = `data:${contentType};base64,${base64}`;

    return new Response(JSON.stringify({ imageUrl: dataUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-avatar error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
