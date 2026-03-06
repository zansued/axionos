
DROP POLICY "Service role manages initiative observability" ON public.initiative_observability;

CREATE POLICY "Editors+ can manage initiative observability"
  ON public.initiative_observability FOR ALL
  TO authenticated
  USING (get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'))
  WITH CHECK (get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin', 'editor'));
