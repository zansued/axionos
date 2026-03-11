import { createRoot } from "react-dom/client";
import "./index.css";

const MAX_RETRIES = 5;
const RETRY_DELAY = 800;

function envReady() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  return url && !url.includes("placeholder");
}

async function boot(attempt = 0) {
  const root = document.getElementById("root")!;

  if (!envReady() && attempt < MAX_RETRIES) {
    console.warn(`[AxionOS] Env not ready, retry ${attempt + 1}/${MAX_RETRIES}...`);
    await new Promise((r) => setTimeout(r, RETRY_DELAY));
    return boot(attempt + 1);
  }

  if (!envReady()) {
    console.error("[AxionOS] CRITICAL: Supabase URL not injected after retries.");
    root.innerHTML = `<div style="padding:2rem;color:#f87171;font-family:monospace;background:#0a0a0a;min-height:100vh;display:flex;align-items:center;justify-content:center"><div><h2>Environment loading...</h2><p>Please refresh the page.</p><button onclick="location.reload()" style="margin-top:1rem;padding:0.5rem 1rem;background:#1488fc;color:white;border:none;border-radius:6px;cursor:pointer">Refresh</button></div></div>`;
    return;
  }

  console.log("[AxionOS] Backend connected:", import.meta.env.VITE_SUPABASE_URL.substring(0, 30) + "...");

  try {
    const { default: App } = await import("./App");
    createRoot(root).render(<App />);
  } catch (e) {
    console.error("Root render error:", e);
    root.innerHTML = `<div style="padding:2rem;color:red;font-family:monospace"><h2>App failed to load</h2><pre>${String(e)}</pre></div>`;
  }
}

boot();
