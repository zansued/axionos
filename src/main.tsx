import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

console.log("[AxionOS] ENV rebuild v2:", {
  url: import.meta.env.VITE_SUPABASE_URL ? "SET" : "MISSING",
  key: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? "SET" : "MISSING",
  projectId: import.meta.env.VITE_SUPABASE_PROJECT_ID ? "SET" : "MISSING",
  urlValue: import.meta.env.VITE_SUPABASE_URL?.substring(0, 30),
});

const root = document.getElementById("root")!;

try {
  createRoot(root).render(<App />);
} catch (e) {
  console.error("Root render error:", e);
  root.innerHTML = `<div style="padding:2rem;color:red;font-family:monospace"><h2>App failed to load</h2><pre>${String(e)}</pre></div>`;
}
