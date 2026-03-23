
-- =============================================
-- FIX 1: readiness_tuning_proposals open RLS
-- =============================================

-- Drop all 3 broken policies
DROP POLICY IF EXISTS "Users can view readiness tuning proposals for their org" ON public.readiness_tuning_proposals;
DROP POLICY IF EXISTS "Service role can insert readiness tuning proposals" ON public.readiness_tuning_proposals;
DROP POLICY IF EXISTS "Service role can update readiness tuning proposals" ON public.readiness_tuning_proposals;

-- Org-scoped SELECT for authenticated users
CREATE POLICY "readiness_tuning_org_select"
  ON public.readiness_tuning_proposals FOR SELECT
  TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id));

-- Service role write (INSERT/UPDATE/DELETE) - used by edge functions
CREATE POLICY "readiness_tuning_service_write"
  ON public.readiness_tuning_proposals FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- =============================================
-- FIX 2: 16 tables with broken crossjoin RLS
-- =============================================

-- 1. resilience_assessments
DROP POLICY IF EXISTS "Org members manage resilience_assessments" ON public.resilience_assessments;
CREATE POLICY "org_member_isolation" ON public.resilience_assessments
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 2. continuity_plans
DROP POLICY IF EXISTS "Org members manage continuity_plans" ON public.continuity_plans;
CREATE POLICY "org_member_isolation" ON public.continuity_plans
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 3. continuity_incidents
DROP POLICY IF EXISTS "Org members manage continuity_incidents" ON public.continuity_incidents;
CREATE POLICY "org_member_isolation" ON public.continuity_incidents
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 4. institutional_memory_constitutions
DROP POLICY IF EXISTS "Org members manage memory_constitutions" ON public.institutional_memory_constitutions;
CREATE POLICY "org_member_isolation" ON public.institutional_memory_constitutions
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 5. memory_retention_policies
DROP POLICY IF EXISTS "Org members manage memory_retention_policies" ON public.memory_retention_policies;
CREATE POLICY "org_member_isolation" ON public.memory_retention_policies
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 6. memory_reconstruction_paths
DROP POLICY IF EXISTS "Org members manage memory_reconstruction_paths" ON public.memory_reconstruction_paths;
CREATE POLICY "org_member_isolation" ON public.memory_reconstruction_paths
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 7. memory_loss_events
DROP POLICY IF EXISTS "Org members manage memory_loss_events" ON public.memory_loss_events;
CREATE POLICY "org_member_isolation" ON public.memory_loss_events
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 8. federated_boundaries
DROP POLICY IF EXISTS "Org members manage federated_boundaries" ON public.federated_boundaries;
CREATE POLICY "org_member_isolation" ON public.federated_boundaries
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 9. boundary_transfer_policies
DROP POLICY IF EXISTS "Org members manage boundary_transfer_policies" ON public.boundary_transfer_policies;
CREATE POLICY "org_member_isolation" ON public.boundary_transfer_policies
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 10. federated_transfer_events
DROP POLICY IF EXISTS "Org members manage federated_transfer_events" ON public.federated_transfer_events;
CREATE POLICY "org_member_isolation" ON public.federated_transfer_events
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 11. boundary_violation_events
DROP POLICY IF EXISTS "Org members manage boundary_violation_events" ON public.boundary_violation_events;
CREATE POLICY "org_member_isolation" ON public.boundary_violation_events
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 12. federated_shared_patterns
DROP POLICY IF EXISTS "Org members manage federated_shared_patterns" ON public.federated_shared_patterns;
CREATE POLICY "org_member_isolation" ON public.federated_shared_patterns
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 13. continuity_assets
DROP POLICY IF EXISTS "Org members manage continuity_assets" ON public.continuity_assets;
CREATE POLICY "org_member_isolation" ON public.continuity_assets
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 14. continuity_dependencies
DROP POLICY IF EXISTS "Org members manage continuity_dependencies" ON public.continuity_dependencies;
CREATE POLICY "org_member_isolation" ON public.continuity_dependencies
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 15. memory_asset_classes
DROP POLICY IF EXISTS "Org members manage memory_asset_classes" ON public.memory_asset_classes;
CREATE POLICY "org_member_isolation" ON public.memory_asset_classes
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));

-- 16. institutional_memory_assets
DROP POLICY IF EXISTS "Org members manage memory_assets" ON public.institutional_memory_assets;
CREATE POLICY "org_member_isolation" ON public.institutional_memory_assets
  FOR ALL TO authenticated
  USING (public.is_org_member(auth.uid(), organization_id))
  WITH CHECK (public.is_org_member(auth.uid(), organization_id));
