-- Seed prevention rule: vite_missing_entrypoint
INSERT INTO public.project_prevention_rules (
  initiative_id,
  organization_id,
  error_pattern,
  prevention_rule,
  scope,
  confidence_score,
  times_triggered
)
SELECT 
  i.id,
  i.organization_id,
  'Could not resolve ./src/main.tsx',
  'ALWAYS ensure src/main.tsx, src/App.tsx, and index.html exist in every React+Vite project. src/main.tsx must import App from "./App" and call ReactDOM.createRoot. index.html must contain <script type="module" src="/src/main.tsx"></script>. Never omit these entrypoint files from the generation plan.',
  'organization',
  0.95,
  1
FROM public.initiatives i
WHERE i.id = (SELECT id FROM public.initiatives ORDER BY created_at ASC LIMIT 1)
ON CONFLICT DO NOTHING;