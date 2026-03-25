/**
 * Sprint 213 — Prompt Guardrails
 * 
 * Centralized, enforced rules injected into ALL code-generation prompts.
 * Prevents the most common classes of build failures:
 * 
 * 1. Environment variables: import.meta.env, NOT process.env
 * 2. Import paths: @/ alias for src/, never bare relative beyond 2 levels
 * 3. Library usage: specific correct import paths
 * 4. Forbidden patterns: process.env, require(), CommonJS
 * 5. Package constraints: no ghost packages, correct names
 * 6. TypeScript: strict patterns for Vite/React projects
 */

// ═══════════════════════════════════════════════════════════════
// Guardrail Rules Block (injected into prompts)
// ═══════════════════════════════════════════════════════════════

/**
 * Core guardrails injected into every code generation prompt.
 * These are non-negotiable rules that prevent build failures.
 */
export const PROMPT_GUARDRAILS_CORE = `
## ⚠️ REGRAS OBRIGATÓRIAS DE BUILD (violação = falha de deploy)

### Variáveis de Ambiente
- ✅ SEMPRE use \`import.meta.env.VITE_*\` para variáveis de ambiente no frontend
- ❌ NUNCA use \`process.env\` — não existe no Vite/browser
- ❌ NUNCA use \`process.env.NODE_ENV\` — use \`import.meta.env.MODE\` ou \`import.meta.env.DEV\`
- Exemplo correto: \`const url = import.meta.env.VITE_SUPABASE_URL\`

### Imports e Módulos
- ✅ Use \`import\` (ESM) — NUNCA \`require()\` ou \`module.exports\`
- ✅ Use \`@/\` para imports de src/ (ex: \`import { Button } from "@/components/ui/button"\`)
- ❌ NUNCA importe de arquivos que não existam no projeto
- ❌ NUNCA use imports relativos profundos (máximo \`../../\`)
- ❌ NUNCA importe diretamente de \`"shadcn/ui"\` — os componentes estão em \`@/components/ui/*\`

### Bibliotecas e Pacotes
- ✅ Ícones: \`import { Icon } from "lucide-react"\` (não "lucide")
- ✅ Plugin Vite: \`@vitejs/plugin-react-swc\` (não \`@vitejs/plugin-react\`)
- ✅ Supabase client: \`import { supabase } from "@/integrations/supabase/client"\`
- ✅ Tipos Supabase: \`import type { Database } from "@/integrations/supabase/types"\`
- ❌ NUNCA adicione "shadcn/ui", "shadcn-ui", "@shadcn/ui" como dependência
- ❌ NUNCA adicione "@radix-ui/react-button" (não existe no npm)
- ❌ NUNCA use "moment" — use "date-fns"
- ❌ NUNCA use "lodash" — use "lodash-es" ou métodos nativos

### TypeScript / React
- ✅ Use \`export default function Component()\` ou \`export default Component\`
- ✅ Use \`React.FC\` ou function components tipados
- ✅ CSS: use Tailwind classes — nunca inline styles complexos
- ❌ NUNCA use \`any\` sem necessidade — prefira tipos explícitos
- ❌ NUNCA deixe imports não utilizados

### package.json (quando gerar)
- ✅ SEMPRE inclua \`"type": "module"\`
- ✅ scripts.build deve ser \`"vite build"\` (NUNCA \`"tsc && vite build"\`)
- ✅ Use \`@vitejs/plugin-react-swc\` em devDependencies
- ✅ Use Node.js engines \`"20.x"\`
`;

/**
 * Backend-specific guardrails (Deno Edge Functions, SQL, etc.)
 */
export const PROMPT_GUARDRAILS_BACKEND = `
### Regras Backend (Edge Functions / SQL)
- ✅ Edge Functions: use \`Deno.serve()\` nativo (não import de \`serve\` legado)
- ✅ SQL schemas: sempre \`CREATE TABLE IF NOT EXISTS\` + RLS policies
- ✅ Supabase client em Edge Functions: \`createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!)\`
- ✅ CORS headers obrigatórios em Edge Functions
- ✅ Referência de usuários: use tabela \`profiles\` (não \`auth.users\` diretamente)
- ✅ Tipagem: use \`ReturnType<typeof createClient>\` para o client Supabase
- ❌ NUNCA use \`atob()\` para validação de webhooks — use \`crypto.subtle\`
`;

/**
 * Manifest-aware guardrail (Sprint 210 integration).
 * Call with the actual file list for the initiative.
 */
export function buildManifestGuardrail(manifestPaths: string[]): string {
  if (manifestPaths.length === 0) return "";
  
  // Limit to reasonable size for prompt
  const displayPaths = manifestPaths.slice(0, 150);
  const truncated = manifestPaths.length > 150;
  
  return `
### Arquivos do Projeto (Sprint 210 — Import Validation)
Os ÚNICOS arquivos que existem no projeto são os listados abaixo.
NUNCA importe de um arquivo que NÃO esteja nesta lista.

\`\`\`
${displayPaths.join("\n")}${truncated ? `\n... e mais ${manifestPaths.length - 150} arquivos` : ""}
\`\`\`
`;
}

// ═══════════════════════════════════════════════════════════════
// Post-generation Guardrail Validator
// ═══════════════════════════════════════════════════════════════

export interface GuardrailViolation {
  rule: string;
  line: number;
  snippet: string;
  severity: "error" | "warning";
  autoFixable: boolean;
}

/**
 * Scan generated code for guardrail violations.
 * Returns violations found and optionally auto-fixed code.
 */
export function validateGuardrails(
  code: string,
  filePath: string,
  isBackend: boolean = false,
): { violations: GuardrailViolation[]; fixedCode: string; wasFixed: boolean } {
  const violations: GuardrailViolation[] = [];
  let fixedCode = code;
  let wasFixed = false;

  const lines = code.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Only check src/ files for frontend rules
    if (filePath.startsWith("src/") || !isBackend) {
      // process.env usage
      if (/process\.env\./.test(line) && !line.trim().startsWith("//")) {
        violations.push({
          rule: "no-process-env",
          line: lineNum,
          snippet: line.trim().slice(0, 80),
          severity: "error",
          autoFixable: true,
        });
        // Auto-fix: replace process.env.VITE_* with import.meta.env.VITE_*
        fixedCode = fixedCode.replace(
          /process\.env\.(VITE_\w+)/g,
          "import.meta.env.$1"
        );
        // Replace process.env.NODE_ENV
        fixedCode = fixedCode.replace(
          /process\.env\.NODE_ENV/g,
          "import.meta.env.MODE"
        );
        wasFixed = true;
      }

      // require() usage
      if (/\brequire\s*\(/.test(line) && !line.trim().startsWith("//")) {
        violations.push({
          rule: "no-require",
          line: lineNum,
          snippet: line.trim().slice(0, 80),
          severity: "error",
          autoFixable: false,
        });
      }

      // module.exports
      if (/module\.exports/.test(line)) {
        violations.push({
          rule: "no-commonjs-exports",
          line: lineNum,
          snippet: line.trim().slice(0, 80),
          severity: "error",
          autoFixable: false,
        });
      }

      // Direct shadcn import
      if (/from\s+["']shadcn\/ui["']/.test(line) || /from\s+["']@shadcn\/ui["']/.test(line)) {
        violations.push({
          rule: "no-shadcn-direct-import",
          line: lineNum,
          snippet: line.trim().slice(0, 80),
          severity: "error",
          autoFixable: false,
        });
      }

      // lucide instead of lucide-react
      if (/from\s+["']lucide["']/.test(line)) {
        violations.push({
          rule: "use-lucide-react",
          line: lineNum,
          snippet: line.trim().slice(0, 80),
          severity: "error",
          autoFixable: true,
        });
        fixedCode = fixedCode.replace(/from\s+["']lucide["']/g, 'from "lucide-react"');
        wasFixed = true;
      }
    }
  }

  return { violations, fixedCode, wasFixed };
}

/**
 * Compose the full guardrail block for a given context.
 */
export function composeGuardrails(opts: {
  isBackend: boolean;
  manifestPaths?: string[];
}): string {
  let block = PROMPT_GUARDRAILS_CORE;
  if (opts.isBackend) block += PROMPT_GUARDRAILS_BACKEND;
  if (opts.manifestPaths?.length) block += buildManifestGuardrail(opts.manifestPaths);
  return block;
}
