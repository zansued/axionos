
-- Sprint 141: Fix — create only missing tables

-- canon_retrieval_feedback already exists, skip it

-- 6. Canon Retrieval Contexts (if not already created)
CREATE TABLE IF NOT EXISTS public.canon_retrieval_contexts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) NOT NULL,
  context_label TEXT NOT NULL DEFAULT '',
  context_type TEXT NOT NULL DEFAULT 'task',
  required_domains JSONB NOT NULL DEFAULT '[]'::jsonb,
  optional_domains JSONB NOT NULL DEFAULT '[]'::jsonb,
  required_practice_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  fallback_posture TEXT NOT NULL DEFAULT 'degrade_gracefully',
  confidence_threshold NUMERIC NOT NULL DEFAULT 0.5,
  max_entries INT NOT NULL DEFAULT 10,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.canon_retrieval_contexts ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'select_canon_retrieval_contexts') THEN
    CREATE POLICY "select_canon_retrieval_contexts" ON public.canon_retrieval_contexts FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'insert_canon_retrieval_contexts') THEN
    CREATE POLICY "insert_canon_retrieval_contexts" ON public.canon_retrieval_contexts FOR INSERT TO authenticated WITH CHECK (organization_id IS NOT NULL);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'update_canon_retrieval_contexts') THEN
    CREATE POLICY "update_canon_retrieval_contexts" ON public.canon_retrieval_contexts FOR UPDATE TO authenticated USING (organization_id IS NOT NULL);
  END IF;
END $$;
