import { createRoot } from "react-dom/client";
import { installGlobalErrorHandlers } from "@/lib/observability";
import App from "./App";
import "./index.css";

// Install global error capture before React mounts
installGlobalErrorHandlers();

createRoot(document.getElementById("root")!).render(<App />);
