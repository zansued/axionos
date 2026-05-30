
-- ===== git_connections: restrict SELECT to owner/admin (tokens) =====
DROP POLICY IF EXISTS "Org members can view git connections" ON public.git_connections;
CREATE POLICY "Admins can view git connections"
ON public.git_connections FOR SELECT TO authenticated
USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin'));

-- ===== supabase_connections: restrict SELECT to owner/admin (anon key) =====
DROP POLICY IF EXISTS "Org members can view supabase connections" ON public.supabase_connections;
CREATE POLICY "Admins can view supabase connections"
ON public.supabase_connections FOR SELECT TO authenticated
USING (public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin'));

-- ===== audit_logs: add org-wide view for admins =====
CREATE POLICY "Admins can view org audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (
  organization_id IS NOT NULL
  AND public.get_user_org_role(auth.uid(), organization_id) IN ('owner','admin')
);

-- ===== canon_* weak INSERT/UPDATE policies =====
DROP POLICY IF EXISTS "insert_canon_entry_usage_constraints" ON public.canon_entry_usage_constraints;
DROP POLICY IF EXISTS "update_canon_entry_usage_constraints" ON public.canon_entry_usage_constraints;
CREATE POLICY "insert_canon_entry_usage_constraints" ON public.canon_entry_usage_constraints
FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "update_canon_entry_usage_constraints" ON public.canon_entry_usage_constraints
FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "insert_canon_retrieval_contexts" ON public.canon_retrieval_contexts;
DROP POLICY IF EXISTS "update_canon_retrieval_contexts" ON public.canon_retrieval_contexts;
CREATE POLICY "insert_canon_retrieval_contexts" ON public.canon_retrieval_contexts
FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "update_canon_retrieval_contexts" ON public.canon_retrieval_contexts
FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "org_members_insert_canon_sources" ON public.canon_sources;
DROP POLICY IF EXISTS "org_members_update_canon_sources" ON public.canon_sources;
CREATE POLICY "org_members_insert_canon_sources" ON public.canon_sources
FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_members_update_canon_sources" ON public.canon_sources
FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "org_members_insert_canon_source_policies" ON public.canon_source_policies;
CREATE POLICY "org_members_insert_canon_source_policies" ON public.canon_source_policies
FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "org_members_insert_canon_source_sync_runs" ON public.canon_source_sync_runs;
DROP POLICY IF EXISTS "org_members_update_canon_source_sync_runs" ON public.canon_source_sync_runs;
CREATE POLICY "org_members_insert_canon_source_sync_runs" ON public.canon_source_sync_runs
FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_members_update_canon_source_sync_runs" ON public.canon_source_sync_runs
FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "org_members_insert_canon_source_categories" ON public.canon_source_categories;
DROP POLICY IF EXISTS "org_members_update_canon_source_categories" ON public.canon_source_categories;
CREATE POLICY "org_members_insert_canon_source_categories" ON public.canon_source_categories
FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_members_update_canon_source_categories" ON public.canon_source_categories
FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "org_members_insert_canon_source_trust_profiles" ON public.canon_source_trust_profiles;
DROP POLICY IF EXISTS "org_members_update_canon_source_trust_profiles" ON public.canon_source_trust_profiles;
CREATE POLICY "org_members_insert_canon_source_trust_profiles" ON public.canon_source_trust_profiles
FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_members_update_canon_source_trust_profiles" ON public.canon_source_trust_profiles
FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "org_members_insert_canon_source_domains" ON public.canon_source_domains;
CREATE POLICY "org_members_insert_canon_source_domains" ON public.canon_source_domains
FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "org_members_insert_canon_candidate_entries" ON public.canon_candidate_entries;
DROP POLICY IF EXISTS "org_members_update_canon_candidate_entries" ON public.canon_candidate_entries;
CREATE POLICY "org_members_insert_canon_candidate_entries" ON public.canon_candidate_entries
FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_members_update_canon_candidate_entries" ON public.canon_candidate_entries
FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

-- ===== doctrine_* and conflict_* tables: use is_org_member =====
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'doctrine_context_profiles','doctrine_adaptation_rules','doctrine_adaptation_evaluations','doctrine_drift_events',
    'conflict_resolution_events','conflict_precedents','conflict_resolution_paths','conflict_evidence_records',
    'institutional_conflicts'
  ];
  p record;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    FOR p IN SELECT policyname, cmd FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
    END LOOP;
    EXECUTE format('CREATE POLICY "select_%1$s_members" ON public.%1$I FOR SELECT TO authenticated USING (public.is_org_member(auth.uid(), organization_id))', t);
    EXECUTE format('CREATE POLICY "insert_%1$s_members" ON public.%1$I FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id))', t);
    EXECUTE format('CREATE POLICY "update_%1$s_members" ON public.%1$I FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id))', t);
  END LOOP;
END $$;

-- ===== learning_candidates: fix broken policies =====
DROP POLICY IF EXISTS "Users can insert learning candidates in their org" ON public.learning_candidates;
DROP POLICY IF EXISTS "Users can update learning candidates in their org" ON public.learning_candidates;
DROP POLICY IF EXISTS "Users can view learning candidates in their org" ON public.learning_candidates;
CREATE POLICY "Users can view learning candidates in their org"
ON public.learning_candidates FOR SELECT TO authenticated
USING (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Users can insert learning candidates in their org"
ON public.learning_candidates FOR INSERT TO authenticated
WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "Users can update learning candidates in their org"
ON public.learning_candidates FOR UPDATE TO authenticated
USING (public.is_org_member(auth.uid(), organization_id));
