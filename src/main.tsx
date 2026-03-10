import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// AxionOS env diagnostics — v3
const supaUrl = import.meta.env.VITE_SUPABASE_URL;
const supaKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supaUrl || supaUrl.includes("placeholder")) {
  console.error("[AxionOS] CRITICAL: Supabase URL not injected. Got:", supaUrl);
} else {
  console.log("[AxionOS] Backend connected:", supaUrl.substring(0, 30) + "...");
}

const root = document.getElementById("root")!;

try {
  createRoot(root).render(<App />);
} catch (e) {
  console.error("Root render error:", e);
  root.innerHTML = `<div style="padding:2rem;color:red;font-family:monospace"><h2>App failed to load</h2><pre>${String(e)}</pre></div>`;
}
