
-- Add file_path and file_type columns to story_subtasks for code generation
ALTER TABLE public.story_subtasks
  ADD COLUMN file_path text DEFAULT NULL,
  ADD COLUMN file_type text DEFAULT NULL;

-- file_path: e.g. "src/components/Header.tsx"
-- file_type: e.g. "scaffold", "component", "page", "style", "config", "hook", "util", "test"

COMMENT ON COLUMN public.story_subtasks.file_path IS 'Target file path for code generation (e.g. src/components/Header.tsx)';
COMMENT ON COLUMN public.story_subtasks.file_type IS 'Type of file: scaffold, component, page, style, config, hook, util, test';
