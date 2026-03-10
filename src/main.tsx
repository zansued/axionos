import { createRoot } from "react-dom/client";
import "./index.css";

const root = document.getElementById("root")!;

// Guard against missing env vars (transient preview issue)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
if (!supabaseUrl) {
  console.warn("VITE_SUPABASE_URL missing — reloading in 2s");
  root.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;color:#888"><p>Carregando ambiente… aguarde.</p></div>`;
  setTimeout(() => window.location.reload(), 2000);
} else {
  import("./App").then(({ default: App }) => {
    try {
      createRoot(root).render(<App />);
    } catch (e) {
      console.error("Root render error:", e);
      root.innerHTML = `<div style="padding:2rem;color:red;font-family:monospace"><h2>App failed to load</h2><pre>${String(e)}</pre></div>`;
    }
  });
}
