
-- 1. Enums for artifact types and statuses
CREATE TYPE public.output_type AS ENUM ('code', 'content', 'decision', 'analysis');
CREATE TYPE public.output_status AS ENUM ('draft', 'pending_review', 'approved', 'rejected', 'deployed');

-- 2. Main entity: agent_outputs
CREATE TABLE public.agent_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  agent_id uuid REFERENCES public.agents(id) ON DELETE SET NULL,
  subtask_id uuid REFERENCES public.story_subtasks(id) ON DELETE SET NULL,
  type public.output_type NOT NULL DEFAULT 'analysis',
  status public.output_status NOT NULL DEFAULT 'draft',
  summary text,
  raw_output jsonb NOT NULL DEFAULT '{}'::jsonb,
  model_used text,
  prompt_used text,
  tokens_used integer DEFAULT 0,
  cost_estimate numeric(10,6) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_outputs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view outputs"
ON public.agent_outputs FOR SELECT TO authenticated
USING (public.is_org_member(auth.uid(), organization_id));

CREATE POLICY "Editors+ can create outputs"
ON public.agent_outputs FOR INSERT TO authenticated
WITH CHECK (public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'));

CREATE POLICY "Editors+ can update outputs"
ON public.agent_outputs FOR UPDATE TO authenticated
USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'));

CREATE POLICY "Admins can delete outputs"
ON public.agent_outputs FOR DELETE TO authenticated
USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin'));

CREATE TRIGGER update_agent_outputs_updated_at
BEFORE UPDATE ON public.agent_outputs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Code artifacts
CREATE TABLE public.code_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  output_id uuid NOT NULL REFERENCES public.agent_outputs(id) ON DELETE CASCADE,
  repository text,
  branch_name text,
  diff_patch text,
  files_affected jsonb DEFAULT '[]'::jsonb,
  build_status text DEFAULT 'pending',
  test_status text DEFAULT 'pending',
  pr_url text,
  preview_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.code_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view code artifacts"
ON public.code_artifacts FOR SELECT TO authenticated
USING (output_id IN (
  SELECT id FROM public.agent_outputs WHERE public.is_org_member(auth.uid(), organization_id)
));

CREATE POLICY "Editors+ can manage code artifacts"
ON public.code_artifacts FOR ALL TO authenticated
USING (output_id IN (
  SELECT id FROM public.agent_outputs
  WHERE public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
))
WITH CHECK (output_id IN (
  SELECT id FROM public.agent_outputs
  WHERE public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
));

-- 4. Content documents (versionable)
CREATE TABLE public.content_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  output_id uuid NOT NULL REFERENCES public.agent_outputs(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  slug text,
  html text,
  markdown text,
  status text DEFAULT 'draft',
  performance_metrics jsonb DEFAULT '{}'::jsonb,
  parent_version uuid REFERENCES public.content_documents(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.content_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view content documents"
ON public.content_documents FOR SELECT TO authenticated
USING (output_id IN (
  SELECT id FROM public.agent_outputs WHERE public.is_org_member(auth.uid(), organization_id)
));

CREATE POLICY "Editors+ can manage content documents"
ON public.content_documents FOR ALL TO authenticated
USING (output_id IN (
  SELECT id FROM public.agent_outputs
  WHERE public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
))
WITH CHECK (output_id IN (
  SELECT id FROM public.agent_outputs
  WHERE public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
));

-- 5. Architecture Decision Records (ADRs)
CREATE TABLE public.adrs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  output_id uuid NOT NULL REFERENCES public.agent_outputs(id) ON DELETE CASCADE,
  title text NOT NULL,
  context text,
  decision text,
  consequences text,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'proposed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.adrs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view ADRs"
ON public.adrs FOR SELECT TO authenticated
USING (output_id IN (
  SELECT id FROM public.agent_outputs WHERE public.is_org_member(auth.uid(), organization_id)
));

CREATE POLICY "Editors+ can manage ADRs"
ON public.adrs FOR ALL TO authenticated
USING (output_id IN (
  SELECT id FROM public.agent_outputs
  WHERE public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
))
WITH CHECK (output_id IN (
  SELECT id FROM public.agent_outputs
  WHERE public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
));

CREATE TRIGGER update_adrs_updated_at
BEFORE UPDATE ON public.adrs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Validation runs
CREATE TABLE public.validation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id uuid NOT NULL REFERENCES public.agent_outputs(id) ON DELETE CASCADE,
  type text NOT NULL,
  result text NOT NULL DEFAULT 'pending',
  logs text,
  duration integer,
  executed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.validation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view validation runs"
ON public.validation_runs FOR SELECT TO authenticated
USING (artifact_id IN (
  SELECT id FROM public.agent_outputs WHERE public.is_org_member(auth.uid(), organization_id)
));

CREATE POLICY "Editors+ can manage validation runs"
ON public.validation_runs FOR ALL TO authenticated
USING (artifact_id IN (
  SELECT id FROM public.agent_outputs
  WHERE public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
))
WITH CHECK (artifact_id IN (
  SELECT id FROM public.agent_outputs
  WHERE public.get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor')
));

-- Enable realtime for agent_outputs
ALTER PUBLICATION supabase_realtime ADD TABLE public.agent_outputs;
