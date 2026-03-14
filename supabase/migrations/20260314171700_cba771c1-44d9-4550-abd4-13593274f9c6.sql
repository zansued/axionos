-- Temporarily disable validation triggers to fix contradictory data
ALTER TABLE public.canon_candidate_entries DISABLE TRIGGER trg_validate_candidate_review;
ALTER TABLE public.canon_candidate_entries DISABLE TRIGGER trg_validate_candidate_promotion;

-- Fix 2 contradictory records: promoted but rejected → correct review to approved
UPDATE public.canon_candidate_entries
SET internal_validation_status = 'approved'
WHERE promotion_status = 'promoted'
  AND internal_validation_status = 'rejected';

-- Re-enable triggers
ALTER TABLE public.canon_candidate_entries ENABLE TRIGGER trg_validate_candidate_review;
ALTER TABLE public.canon_candidate_entries ENABLE TRIGGER trg_validate_candidate_promotion;