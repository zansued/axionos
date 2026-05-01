import { authenticateWithRateLimit } from "../_shared/auth.ts";
import { handleCors, getCorsHeaders, jsonResponse, errorResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const authResult = await authenticateWithRateLimit(req, "generate-avatar");
    if (authResult instanceof Response) return authResult;

    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string" || prompt.length > 500) {
      return errorResponse("prompt is required (max 500 chars)", 400, req);
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
      console.error("Pollinations error:", response.status);
      return errorResponse("Image generation failed", 502, req);
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

    return jsonResponse({ imageUrl: dataUrl }, 200, req);
  } catch (error) {
    console.error("generate-avatar error:", error);
    return errorResponse("Internal error", 500, req);
  }
});
