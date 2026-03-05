
-- Move vector extension to extensions schema (security best practice)
ALTER EXTENSION vector SET SCHEMA extensions;

-- Add embedding column to project_brain_nodes
ALTER TABLE public.project_brain_nodes
ADD COLUMN IF NOT EXISTS embedding vector(768);

-- Add embedding metadata columns
ALTER TABLE public.project_brain_nodes
ADD COLUMN IF NOT EXISTS embedding_model text DEFAULT NULL;

ALTER TABLE public.project_brain_nodes
ADD COLUMN IF NOT EXISTS embedded_at timestamptz DEFAULT NULL;
