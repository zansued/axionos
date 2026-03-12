
-- Sprint 196: Cross-Tenant Isolation Audit — RLS Hardening
-- Replace 36 overly permissive RLS policies with org-scoped policies

-- ═══════════════════════════════════════════════════════════════
-- BLUE TEAM TABLES (7 tables) — Currently public ALL with USING(true)
-- Replace with: authenticated SELECT via org membership, service_role for writes
-- ═══════════════════════════════════════════════════════════════

-- blue_team_alerts
DROP POLICY IF EXISTS "org_access" ON public.blue_team_alerts;
CREATE POLICY "org_members_select_blue_team_alerts" ON public.blue_team_alerts
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "service_role_all_blue_team_alerts" ON public.blue_team_alerts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- blue_team_containment_events
DROP POLICY IF EXISTS "org_access" ON public.blue_team_containment_events;
CREATE POLICY "org_members_select_blue_team_containment_events" ON public.blue_team_containment_events
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "service_role_all_blue_team_containment_events" ON public.blue_team_containment_events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- blue_team_incidents
DROP POLICY IF EXISTS "org_access" ON public.blue_team_incidents;
CREATE POLICY "org_members_select_blue_team_incidents" ON public.blue_team_incidents
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "service_role_all_blue_team_incidents" ON public.blue_team_incidents
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- blue_team_outcome_records
DROP POLICY IF EXISTS "org_access" ON public.blue_team_outcome_records;
CREATE POLICY "org_members_select_blue_team_outcome_records" ON public.blue_team_outcome_records
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "service_role_all_blue_team_outcome_records" ON public.blue_team_outcome_records
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- blue_team_recovery_flows
DROP POLICY IF EXISTS "org_access" ON public.blue_team_recovery_flows;
CREATE POLICY "org_members_select_blue_team_recovery_flows" ON public.blue_team_recovery_flows
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "service_role_all_blue_team_recovery_flows" ON public.blue_team_recovery_flows
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- blue_team_response_actions
DROP POLICY IF EXISTS "org_access" ON public.blue_team_response_actions;
CREATE POLICY "org_members_select_blue_team_response_actions" ON public.blue_team_response_actions
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "service_role_all_blue_team_response_actions" ON public.blue_team_response_actions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- blue_team_runbooks
DROP POLICY IF EXISTS "org_access" ON public.blue_team_runbooks;
CREATE POLICY "org_members_select_blue_team_runbooks" ON public.blue_team_runbooks
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "service_role_all_blue_team_runbooks" ON public.blue_team_runbooks
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- PURPLE LEARNING — Currently public ALL with USING(true)
-- ═══════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "org_access" ON public.purple_learning_reviews;
CREATE POLICY "org_members_select_purple_learning_reviews" ON public.purple_learning_reviews
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "service_role_all_purple_learning_reviews" ON public.purple_learning_reviews
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- CANON TABLES — Authenticated ALL/SELECT with USING(true)
-- Replace with org-scoped policies
-- ═══════════════════════════════════════════════════════════════

-- canon_candidate_entries (SELECT)
DROP POLICY IF EXISTS "org_members_select_canon_candidate_entries" ON public.canon_candidate_entries;
CREATE POLICY "org_scoped_select_canon_candidate_entries" ON public.canon_candidate_entries
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- canon_candidate_lineage (ALL)
DROP POLICY IF EXISTS "Authenticated users can manage canon_candidate_lineage" ON public.canon_candidate_lineage;
CREATE POLICY "org_scoped_select_canon_candidate_lineage" ON public.canon_candidate_lineage
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "service_role_all_canon_candidate_lineage" ON public.canon_candidate_lineage
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- canon_candidate_reviews (ALL)
DROP POLICY IF EXISTS "Authenticated users can manage canon_candidate_reviews" ON public.canon_candidate_reviews;
CREATE POLICY "org_scoped_select_canon_candidate_reviews" ON public.canon_candidate_reviews
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "service_role_all_canon_candidate_reviews" ON public.canon_candidate_reviews
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- canon_entry_conflicts (SELECT)
DROP POLICY IF EXISTS "select_canon_entry_conflicts" ON public.canon_entry_conflicts;
CREATE POLICY "org_scoped_select_canon_entry_conflicts" ON public.canon_entry_conflicts
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- canon_entry_domains (SELECT)
DROP POLICY IF EXISTS "select_canon_entry_domains" ON public.canon_entry_domains;
CREATE POLICY "org_scoped_select_canon_entry_domains" ON public.canon_entry_domains
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- canon_entry_usage_constraints (SELECT)
DROP POLICY IF EXISTS "select_canon_entry_usage_constraints" ON public.canon_entry_usage_constraints;
CREATE POLICY "org_scoped_select_canon_entry_usage_constraints" ON public.canon_entry_usage_constraints
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- canon_failure_patterns (ALL)
DROP POLICY IF EXISTS "Authenticated users can manage canon_failure_patterns" ON public.canon_failure_patterns;
CREATE POLICY "org_scoped_select_canon_failure_patterns" ON public.canon_failure_patterns
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "service_role_all_canon_failure_patterns" ON public.canon_failure_patterns
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- canon_learning_candidates (ALL)
DROP POLICY IF EXISTS "Authenticated users can manage canon_learning_candidates" ON public.canon_learning_candidates;
CREATE POLICY "org_scoped_select_canon_learning_candidates" ON public.canon_learning_candidates
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "service_role_all_canon_learning_candidates" ON public.canon_learning_candidates
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- canon_learning_signals (ALL)
DROP POLICY IF EXISTS "Authenticated users can manage canon_learning_signals" ON public.canon_learning_signals;
CREATE POLICY "org_scoped_select_canon_learning_signals" ON public.canon_learning_signals
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "service_role_all_canon_learning_signals" ON public.canon_learning_signals
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- canon_refactor_patterns (ALL)
DROP POLICY IF EXISTS "Authenticated users can manage canon_refactor_patterns" ON public.canon_refactor_patterns;
CREATE POLICY "org_scoped_select_canon_refactor_patterns" ON public.canon_refactor_patterns
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "service_role_all_canon_refactor_patterns" ON public.canon_refactor_patterns
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- canon_retrieval_contexts (SELECT)
DROP POLICY IF EXISTS "select_canon_retrieval_contexts" ON public.canon_retrieval_contexts;
CREATE POLICY "org_scoped_select_canon_retrieval_contexts" ON public.canon_retrieval_contexts
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- canon_source_categories (SELECT)
DROP POLICY IF EXISTS "org_members_select_canon_source_categories" ON public.canon_source_categories;
CREATE POLICY "org_scoped_select_canon_source_categories" ON public.canon_source_categories
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- canon_source_domains (SELECT)
DROP POLICY IF EXISTS "org_members_select_canon_source_domains" ON public.canon_source_domains;
CREATE POLICY "org_scoped_select_canon_source_domains" ON public.canon_source_domains
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- canon_source_policies (SELECT)
DROP POLICY IF EXISTS "org_members_select_canon_source_policies" ON public.canon_source_policies;
CREATE POLICY "org_scoped_select_canon_source_policies" ON public.canon_source_policies
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- canon_source_sync_runs (SELECT)
DROP POLICY IF EXISTS "org_members_select_canon_source_sync_runs" ON public.canon_source_sync_runs;
CREATE POLICY "org_scoped_select_canon_source_sync_runs" ON public.canon_source_sync_runs
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- canon_source_trust_profiles (SELECT)
DROP POLICY IF EXISTS "org_members_select_canon_source_trust_profiles" ON public.canon_source_trust_profiles;
CREATE POLICY "org_scoped_select_canon_source_trust_profiles" ON public.canon_source_trust_profiles
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- canon_sources (SELECT)
DROP POLICY IF EXISTS "org_members_select_canon_sources" ON public.canon_sources;
CREATE POLICY "org_scoped_select_canon_sources" ON public.canon_sources
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- canon_success_patterns (ALL)
DROP POLICY IF EXISTS "Authenticated users can manage canon_success_patterns" ON public.canon_success_patterns;
CREATE POLICY "org_scoped_select_canon_success_patterns" ON public.canon_success_patterns
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "service_role_all_canon_success_patterns" ON public.canon_success_patterns
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- canon_validation_patterns (ALL)
DROP POLICY IF EXISTS "Authenticated users can manage canon_validation_patterns" ON public.canon_validation_patterns;
CREATE POLICY "org_scoped_select_canon_validation_patterns" ON public.canon_validation_patterns
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "service_role_all_canon_validation_patterns" ON public.canon_validation_patterns
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- OTHER TABLES
-- ═══════════════════════════════════════════════════════════════

-- agent_selection_tuning_proposals (authenticated SELECT USING true)
DROP POLICY IF EXISTS "Allow authenticated read on agent_selection_tuning_proposals" ON public.agent_selection_tuning_proposals;
CREATE POLICY "org_scoped_select_agent_selection_tuning_proposals" ON public.agent_selection_tuning_proposals
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- policy_tuning_proposals (authenticated SELECT/INSERT/UPDATE USING true)
DROP POLICY IF EXISTS "policy_tuning_proposals_org_read" ON public.policy_tuning_proposals;
DROP POLICY IF EXISTS "policy_tuning_proposals_org_insert" ON public.policy_tuning_proposals;
DROP POLICY IF EXISTS "policy_tuning_proposals_org_update" ON public.policy_tuning_proposals;
CREATE POLICY "org_scoped_select_policy_tuning_proposals" ON public.policy_tuning_proposals
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_scoped_insert_policy_tuning_proposals" ON public.policy_tuning_proposals
  FOR INSERT TO authenticated
  WITH CHECK (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "org_scoped_update_policy_tuning_proposals" ON public.policy_tuning_proposals
  FOR UPDATE TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- operational_learning_signals (public INSERT WITH CHECK true)
DROP POLICY IF EXISTS "Service can insert operational signals" ON public.operational_learning_signals;
CREATE POLICY "service_role_insert_operational_learning_signals" ON public.operational_learning_signals
  FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "org_scoped_select_operational_learning_signals" ON public.operational_learning_signals
  FOR SELECT TO authenticated
  USING (organization_id IN (SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()));

-- ai_prompt_cache (public ALL USING true) — scope to service_role only
DROP POLICY IF EXISTS "Service role manages cache" ON public.ai_prompt_cache;
CREATE POLICY "service_role_all_ai_prompt_cache" ON public.ai_prompt_cache
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ai_rate_limits (public ALL USING true) — scope to service_role only
DROP POLICY IF EXISTS "Service role manages rate limits" ON public.ai_rate_limits;
CREATE POLICY "service_role_all_ai_rate_limits" ON public.ai_rate_limits
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- agent_memory_profiles (service_role ALL — already correct target but re-confirm)
-- These are already TO service_role, no change needed

-- architecture_* tables (service_role ALL — already correct target)
-- These are already TO service_role, no change needed
