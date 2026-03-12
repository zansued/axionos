import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

const LOVABLE_CLOUD_PROJECT_ID = "runyuhxgsezsezjypskr";
const LOVABLE_CLOUD_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1bnl1aHhnc2V6c2V6anlwc2tyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMjgwMTAsImV4cCI6MjA4NzcwNDAxMH0.dXlrhpwWg24dnr2fJbXOuXyRKj0L51qXZkBV9bJrZvM";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const projectId = env.VITE_SUPABASE_PROJECT_ID?.trim() || LOVABLE_CLOUD_PROJECT_ID;

  const resolvedSupabaseUrl =
    env.VITE_SUPABASE_URL?.trim() || (projectId ? `https://${projectId}.supabase.co` : "");
  const resolvedSupabasePublishableKey =
    env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    env.VITE_SUPABASE_ANON_KEY?.trim() ||
    LOVABLE_CLOUD_PUBLISHABLE_KEY;

  return {
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(resolvedSupabaseUrl),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(resolvedSupabasePublishableKey),
    },
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "@tanstack/react-query"],
      extensions: [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json"],
    },
    optimizeDeps: {
      include: ["react", "react-dom", "@tanstack/react-query"],
    },
  };
});
