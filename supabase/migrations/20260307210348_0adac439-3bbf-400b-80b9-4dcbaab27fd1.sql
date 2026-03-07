
-- Fix overly permissive FOR ALL policies to use WITH CHECK
DROP POLICY IF EXISTS "org_members_write_strategy_portfolios" ON public.strategy_portfolios;
CREATE POLICY "org_members_insert_strategy_portfolios" ON public.strategy_portfolios FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_members_update_strategy_portfolios" ON public.strategy_portfolios FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_members_delete_strategy_portfolios" ON public.strategy_portfolios FOR DELETE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "org_members_write_spm" ON public.strategy_portfolio_members;
CREATE POLICY "org_members_insert_spm" ON public.strategy_portfolio_members FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_members_update_spm" ON public.strategy_portfolio_members FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_members_delete_spm" ON public.strategy_portfolio_members FOR DELETE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "org_members_write_sp_metrics" ON public.strategy_portfolio_metrics;
CREATE POLICY "org_members_insert_sp_metrics" ON public.strategy_portfolio_metrics FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_members_update_sp_metrics" ON public.strategy_portfolio_metrics FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_members_delete_sp_metrics" ON public.strategy_portfolio_metrics FOR DELETE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));

DROP POLICY IF EXISTS "org_members_write_sp_conflicts" ON public.strategy_portfolio_conflicts;
CREATE POLICY "org_members_insert_sp_conflicts" ON public.strategy_portfolio_conflicts FOR INSERT TO authenticated WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_members_update_sp_conflicts" ON public.strategy_portfolio_conflicts FOR UPDATE TO authenticated USING (public.is_org_member(auth.uid(), organization_id)) WITH CHECK (public.is_org_member(auth.uid(), organization_id));
CREATE POLICY "org_members_delete_sp_conflicts" ON public.strategy_portfolio_conflicts FOR DELETE TO authenticated USING (public.is_org_member(auth.uid(), organization_id));
