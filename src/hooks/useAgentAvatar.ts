import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const cache = new Map<string, string>();

export function useAgentAvatar(name: string, role: string): string {
  const prompt = `${role} AI robot avatar, ${name}, futuristic, minimal, portrait, dark background`;
  const [url, setUrl] = useState(() => cache.get(prompt) || "");

  useEffect(() => {
    if (cache.has(prompt)) {
      setUrl(cache.get(prompt)!);
      return;
    }

    let cancelled = false;

    supabase.functions
      .invoke("generate-avatar", { body: { prompt } })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.warn("Avatar generation failed:", error);
          return;
        }
        const imageUrl = data?.imageUrl as string;
        if (imageUrl) {
          cache.set(prompt, imageUrl);
          setUrl(imageUrl);
        }
      });

    return () => { cancelled = true; };
  }, [prompt]);

  return url;
}

/** Simple sync function returning a pollinations URL (fallback, no auth) */
export function agentAvatarUrl(name: string, role: string): string {
  const seed = encodeURIComponent(`${role} AI robot avatar, ${name}, futuristic, minimal`);
  return `https://image.pollinations.ai/prompt/${seed}?width=128&height=128&nologo=true&seed=${name.length}`;
}
