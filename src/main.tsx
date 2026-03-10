import { createRoot } from "react-dom/client";
import "./index.css";

const root = document.getElementById("root")!;

const MAX_ENV_RETRIES = 5;
const RETRY_DELAY_MS = 1500;

function getRetryCount(): number {
  const v = sessionStorage.getItem("__env_retry") || "0";
  return parseInt(v, 10);
}

function boot() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  if (!supabaseUrl) {
    const retries = getRetryCount();
    if (retries < MAX_ENV_RETRIES) {
      console.warn(`VITE_SUPABASE_URL missing — retry ${retries + 1}/${MAX_ENV_RETRIES}`);
      sessionStorage.setItem("__env_retry", String(retries + 1));
      root.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;color:#888"><p>Carregando ambiente… aguarde.</p></div>`;
      setTimeout(() => window.location.reload(), RETRY_DELAY_MS);
    } else {
      console.error("Environment variables not available after max retries.");
      sessionStorage.removeItem("__env_retry");
      root.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:system-ui;color:#888;gap:1rem"><p>Não foi possível carregar o ambiente.</p><button onclick="sessionStorage.removeItem('__env_retry');window.location.reload()" style="padding:.5rem 1rem;border:1px solid #ccc;border-radius:6px;cursor:pointer;background:#fff">Tentar novamente</button></div>`;
    }
    return;
  }

  // Env available — clear counter and boot app
  sessionStorage.removeItem("__env_retry");
  import("./App").then(({ default: App }) => {
    try {
      createRoot(root).render(<App />);
    } catch (e) {
      console.error("Root render error:", e);
      root.innerHTML = `<div style="padding:2rem;color:red;font-family:monospace"><h2>App failed to load</h2><pre>${String(e)}</pre></div>`;
    }
  });
}

boot();
