/**
 * Maps raw backend/database errors to user-friendly messages.
 * Prevents leaking internal schema details, constraint names, etc.
 */
export function getUserFriendlyError(error: any): string {
  const msg = error?.message || error?.error || String(error);

  // Known Supabase/Postgres error codes
  if (error?.code === "23505") return "Este item já existe.";
  if (error?.code === "23503") return "Este item está vinculado a outros registros.";
  if (error?.code === "42501" || msg.includes("row-level security"))
    return "Você não tem permissão para esta ação.";
  if (error?.code === "PGRST301" || msg.includes("JWT"))
    return "Sessão expirada. Faça login novamente.";

  // Network / auth
  if (msg.includes("Failed to fetch") || msg.includes("NetworkError"))
    return "Erro de conexão. Verifique sua internet.";
  if (msg.includes("Unauthorized") || msg.includes("401"))
    return "Sessão expirada. Faça login novamente.";
  if (msg.includes("Rate limit") || msg.includes("429"))
    return "Muitas requisições. Aguarde um momento.";

  // AI-specific
  if (msg.includes("DEEPSEEK_API_KEY")) return "Configuração de IA não disponível.";
  if (msg.includes("DeepSeek")) return "Erro no serviço de IA. Tente novamente.";
  if (msg.includes("credits exhausted") || msg.includes("402"))
    return "Créditos de IA esgotados. Tente novamente mais tarde.";

  // Generic fallback — don't expose raw message
  return "Ocorreu um erro. Tente novamente.";
}
