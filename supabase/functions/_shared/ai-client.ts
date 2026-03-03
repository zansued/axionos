// Shared AI client: uses OpenAI directly if OPENAI_API_KEY is set, otherwise Lovable AI Gateway

export function getAIConfig() {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  const useOpenAI = !!OPENAI_API_KEY;

  return {
    url: useOpenAI
      ? "https://api.openai.com/v1/chat/completions"
      : "https://ai.gateway.lovable.dev/v1/chat/completions",
    key: useOpenAI ? OPENAI_API_KEY! : (Deno.env.get("LOVABLE_API_KEY") || ""),
    model: useOpenAI ? "gpt-4o" : "google/gemini-2.5-flash",
    proModel: useOpenAI ? "gpt-4o" : "google/gemini-2.5-pro",
  };
}
