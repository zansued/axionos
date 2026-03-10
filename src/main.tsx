import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

const root = document.getElementById("root")!;

try {
  createRoot(root).render(<App />);
} catch (e) {
  console.error("Root render error:", e);
  root.innerHTML = `<div style="padding:2rem;color:red;font-family:monospace"><h2>App failed to load</h2><pre>${String(e)}</pre></div>`;
}
