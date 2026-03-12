/**
 * Canonical Dependency Registry â€” AXIONOS
 *
 * Source of truth for acceptable and preferred versions of the standard stack.
 * Used as offline fallback when the npm registry is unreachable.
 *
 * Update these entries whenever a new stable version is released and tested.
 */

export interface CanonicalDepEntry {
  /** The version to enforce (written into package.json) */
  preferred: string;
  /** The minimum acceptable declared version (older = force upgrade) */
  minAcceptable: string;
  /** Whether this package should always be in devDependencies */
  devOnly?: boolean;
}

export const CANONICAL_DEPS: Record<string, CanonicalDepEntry> = {
  // â”€â”€ Runtime dependencies â”€â”€
  "react":                        { preferred: "^18.3.1",  minAcceptable: "^18.0.0" },
  "react-dom":                    { preferred: "^18.3.1",  minAcceptable: "^18.0.0" },
  "react-router-dom":             { preferred: "^6.30.0",  minAcceptable: "^6.0.0" },
  "lucide-react":                 { preferred: "^0.462.0", minAcceptable: "^0.300.0" },
  "tailwind-merge":               { preferred: "^2.6.0",   minAcceptable: "^2.0.0" },
  "clsx":                         { preferred: "^2.1.1",   minAcceptable: "^2.0.0" },
  "class-variance-authority":     { preferred: "^0.7.1",   minAcceptable: "^0.7.0" },
  "@supabase/supabase-js":        { preferred: "^2.50.0",  minAcceptable: "^2.0.0" },
  "@tanstack/react-query":        { preferred: "^5.69.0",  minAcceptable: "^5.0.0" },
  "sonner":                       { preferred: "^1.7.4",   minAcceptable: "^1.0.0" },
  "zustand":                      { preferred: "^5.0.3",   minAcceptable: "^4.0.0" },
  "zod":                          { preferred: "^3.24.2",  minAcceptable: "^3.0.0" },
  "react-hook-form":              { preferred: "^7.54.2",  minAcceptable: "^7.0.0" },
  "@hookform/resolvers":          { preferred: "^3.10.0",  minAcceptable: "^3.0.0" },
  "date-fns":                     { preferred: "^4.1.0",   minAcceptable: "^3.0.0" },
  "framer-motion":                { preferred: "^12.5.0",  minAcceptable: "^10.0.0" },
  "recharts":                     { preferred: "^2.15.1",  minAcceptable: "^2.0.0" },

  // â”€â”€ Dev dependencies â”€â”€
  "vite":                         { preferred: "^5.4.19",  minAcceptable: "^5.0.0",  devOnly: true },
  "@vitejs/plugin-react-swc":     { preferred: "^3.11.0",  minAcceptable: "^3.0.0",  devOnly: true },
  "typescript":                   { preferred: "^5.8.3",   minAcceptable: "^5.0.0",  devOnly: true },
  "tailwindcss":                  { preferred: "^3.4.17",  minAcceptable: "^3.0.0",  devOnly: true },
  "autoprefixer":                 { preferred: "^10.4.21", minAcceptable: "^10.0.0", devOnly: true },
  "postcss":                      { preferred: "^8.5.6",   minAcceptable: "^8.0.0",  devOnly: true },
  "@types/react":                 { preferred: "^18.3.23", minAcceptable: "^18.0.0", devOnly: true },
  "@types/react-dom":             { preferred: "^18.3.7",  minAcceptable: "^18.0.0", devOnly: true },
  "@types/node":                  { preferred: "^22.13.10",minAcceptable: "^20.0.0", devOnly: true },

  // â”€â”€ ESLint / Linting (Pinned to stable v9 due to peer-dep conflicts in v10) â”€â”€
  "eslint":                       { preferred: "^9.32.0",  minAcceptable: "^9.0.0",  devOnly: true },
  "eslint-plugin-react-hooks":    { preferred: "^5.2.0",   minAcceptable: "^5.0.0",  devOnly: true },
  "eslint-plugin-react-refresh":  { preferred: "^0.4.20",  minAcceptable: "^0.4.0",  devOnly: true },
  "typescript-eslint":            { preferred: "^8.38.0",  minAcceptable: "^8.0.0",  devOnly: true },
  "@eslint/js":                   { preferred: "^9.32.0",  minAcceptable: "^9.0.0",  devOnly: true },
};

/** Packages that are permanently deprecated/renamed and should never appear */
export const BLOCKED_PACKAGES = new Set([
  "eslint@10",             // blocked until plugins support v10 (peer-dep ERESOLVE)
  "react-scripts",         // CRA â€” EOL
  "create-react-app",      // EOL
  "node-sass",             // deprecated, use sass
  "request",               // deprecated
  "moment",                // legacy, use date-fns or dayjs
  "lodash",                // prefer native ES or lodash-es
  "@vitejs/plugin-react",  // replaced by plugin-react-swc
]);
