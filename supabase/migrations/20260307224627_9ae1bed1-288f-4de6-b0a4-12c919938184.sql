
-- Sprint 36: Semantic Retrieval & Embedding Memory Expansion

-- 1. Semantic Retrieval Domains
CREATE TABLE public.semantic_retrieval_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_key text NOT NULL UNIQUE,
  domain_name text NOT NULL,
  scope_type text NOT NULL,
  source_tables jsonb NOT NULL DEFAULT '[]'::jsonb,
  embedding_enabled boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.semantic_retrieval_domains ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read semantic_retrieval_domains" ON public.semantic_retrieval_domains FOR SELECT TO authenticated USING (true);

-- Validation trigger
CREATE OR REPLACE FUNCTION public.validate_semantic_retrieval_domain()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.scope_type NOT IN ('global', 'organization', 'workspace', 'context_class') THEN
    RAISE EXCEPTION 'Invalid scope_type: %', NEW.scope_type;
  END IF;
  IF NEW.status NOT IN ('active', 'watch', 'deprecated') THEN
    RAISE EXCEPTION 'Invalid semantic_retrieval_domains status: %', NEW.status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_semantic_retrieval_domain
BEFORE INSERT OR UPDATE ON public.semantic_retrieval_domains
FOR EACH ROW EXECUTE FUNCTION public.validate_semantic_retrieval_domain();

-- 2. Semantic Retrieval Indices
CREATE TABLE public.semantic_retrieval_indices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid NOT NULL REFERENCES public.semantic_retrieval_domains(id),
  index_key text NOT NULL UNIQUE,
  embedding_model text NOT NULL,
  vector_dimensions integer NOT NULL,
  source_scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  freshness_policy jsonb NULL,
  ranking_policy jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.semantic_retrieval_indices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read semantic_retrieval_indices" ON public.semantic_retrieval_indices FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.validate_semantic_retrieval_index()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('active', 'rebuilding', 'frozen', 'deprecated') THEN
    RAISE EXCEPTION 'Invalid semantic_retrieval_indices status: %', NEW.status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_semantic_retrieval_index
BEFORE INSERT OR UPDATE ON public.semantic_retrieval_indices
FOR EACH ROW EXECUTE FUNCTION public.validate_semantic_retrieval_index();

-- 3. Semantic Retrieval Sessions
CREATE TABLE public.semantic_retrieval_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  session_type text NOT NULL,
  scope_ref jsonb NULL,
  query_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  domains_used jsonb NOT NULL DEFAULT '[]'::jsonb,
  ranked_results jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence_score numeric NULL,
  rationale_codes jsonb NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.semantic_retrieval_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can read semantic_retrieval_sessions" ON public.semantic_retrieval_sessions FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- 4. Semantic Retrieval Feedback
CREATE TABLE public.semantic_retrieval_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retrieval_session_id uuid NOT NULL REFERENCES public.semantic_retrieval_sessions(id),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  usefulness_status text NOT NULL,
  feedback_reason jsonb NULL,
  linked_outcome jsonb NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.semantic_retrieval_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members can read semantic_retrieval_feedback" ON public.semantic_retrieval_feedback FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

CREATE OR REPLACE FUNCTION public.validate_semantic_retrieval_feedback()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.usefulness_status NOT IN ('helpful', 'neutral', 'harmful', 'inconclusive') THEN
    RAISE EXCEPTION 'Invalid usefulness_status: %', NEW.usefulness_status;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_validate_semantic_retrieval_feedback
BEFORE INSERT OR UPDATE ON public.semantic_retrieval_feedback
FOR EACH ROW EXECUTE FUNCTION public.validate_semantic_retrieval_feedback();
