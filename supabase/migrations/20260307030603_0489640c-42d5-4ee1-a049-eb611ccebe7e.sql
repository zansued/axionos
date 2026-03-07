
-- Fix overly permissive policy on product_plans - restrict management to service role only
DROP POLICY IF EXISTS "Service role manages plans" ON public.product_plans;
-- No INSERT/UPDATE/DELETE policy for authenticated users means only service role can modify
