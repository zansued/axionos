DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;

DROP POLICY IF EXISTS "Authenticated users can read semantic_retrieval_indices" ON public.semantic_retrieval_indices;
CREATE POLICY "Org members can read semantic_retrieval_indices" ON public.semantic_retrieval_indices
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.user_id = auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can read semantic_retrieval_domains" ON public.semantic_retrieval_domains;
CREATE POLICY "Org members can read semantic_retrieval_domains" ON public.semantic_retrieval_domains
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.organization_members om WHERE om.user_id = auth.uid()));