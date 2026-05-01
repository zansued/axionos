-- Restrict billing_accounts SELECT to owner/admin roles only
DROP POLICY IF EXISTS "Org members can view billing" ON public.billing_accounts;

CREATE POLICY "Org admins can view billing"
  ON public.billing_accounts FOR SELECT
  TO authenticated
  USING (get_user_org_role(auth.uid(), organization_id) IN ('owner', 'admin'));