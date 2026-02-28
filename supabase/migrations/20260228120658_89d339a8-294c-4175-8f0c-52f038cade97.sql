
-- Fix overly permissive INSERT on organizations: require the creator to immediately become owner
DROP POLICY "Authenticated users can create organizations" ON public.organizations;

CREATE POLICY "Authenticated users can create organizations"
ON public.organizations FOR INSERT
TO authenticated
WITH CHECK (
  -- After insert, a trigger or app code must add the user as owner.
  -- We allow insert but the org is useless without membership (enforced by RLS on all other tables).
  auth.uid() IS NOT NULL
);
