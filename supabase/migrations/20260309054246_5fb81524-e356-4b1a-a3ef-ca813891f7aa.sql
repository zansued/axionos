
-- Fix RLS policies for Sprint 101 tables to use proper org membership check
DROP POLICY IF EXISTS "Users can manage federated_boundaries in their org" ON public.federated_boundaries;
CREATE POLICY "Org members manage federated_boundaries" ON public.federated_boundaries FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can manage boundary_transfer_policies in their org" ON public.boundary_transfer_policies;
CREATE POLICY "Org members manage boundary_transfer_policies" ON public.boundary_transfer_policies FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can manage federated_transfer_events in their org" ON public.federated_transfer_events;
CREATE POLICY "Org members manage federated_transfer_events" ON public.federated_transfer_events FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can manage boundary_violation_events in their org" ON public.boundary_violation_events;
CREATE POLICY "Org members manage boundary_violation_events" ON public.boundary_violation_events FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can manage federated_shared_patterns in their org" ON public.federated_shared_patterns;
CREATE POLICY "Org members manage federated_shared_patterns" ON public.federated_shared_patterns FOR ALL USING (
  organization_id IN (
    SELECT organization_id FROM public.profiles WHERE id = auth.uid()
  )
);
