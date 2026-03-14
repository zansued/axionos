
-- Sprint 204: Lifecycle transition enforcement triggers

-- ─── Candidate review status transition validation ───
CREATE OR REPLACE FUNCTION public.validate_candidate_review_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only validate if internal_validation_status actually changed
  IF OLD.internal_validation_status = NEW.internal_validation_status THEN
    RETURN NEW;
  END IF;

  -- Normalize legacy values on write
  IF NEW.internal_validation_status = 'needs_review' THEN
    NEW.internal_validation_status := 'needs_human_review';
  END IF;

  -- Validate transitions
  IF OLD.internal_validation_status = 'pending' AND NEW.internal_validation_status NOT IN ('approved', 'needs_human_review', 'rejected') THEN
    RAISE EXCEPTION 'Invalid candidate review transition: % → %', OLD.internal_validation_status, NEW.internal_validation_status;
  END IF;

  IF OLD.internal_validation_status = 'needs_human_review' AND NEW.internal_validation_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid candidate review transition: % → %', OLD.internal_validation_status, NEW.internal_validation_status;
  END IF;

  IF OLD.internal_validation_status IN ('approved', 'rejected') AND OLD.internal_validation_status != NEW.internal_validation_status THEN
    RAISE EXCEPTION 'Invalid candidate review transition: % is terminal', OLD.internal_validation_status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_candidate_review ON public.canon_candidate_entries;
CREATE TRIGGER trg_validate_candidate_review
  BEFORE UPDATE ON public.canon_candidate_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_candidate_review_transition();

-- ─── Candidate promotion status transition validation ───
CREATE OR REPLACE FUNCTION public.validate_candidate_promotion_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.promotion_status = NEW.promotion_status THEN
    RETURN NEW;
  END IF;

  -- Normalize legacy 'rejected' to 'not_promoted'
  IF NEW.promotion_status = 'rejected' THEN
    NEW.promotion_status := 'not_promoted';
  END IF;

  IF OLD.promotion_status = 'pending' AND NEW.promotion_status NOT IN ('promoted', 'not_promoted') THEN
    RAISE EXCEPTION 'Invalid candidate promotion transition: % → %', OLD.promotion_status, NEW.promotion_status;
  END IF;

  IF OLD.promotion_status IN ('promoted', 'not_promoted') AND OLD.promotion_status != NEW.promotion_status THEN
    RAISE EXCEPTION 'Invalid candidate promotion transition: % is terminal', OLD.promotion_status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_candidate_promotion ON public.canon_candidate_entries;
CREATE TRIGGER trg_validate_candidate_promotion
  BEFORE UPDATE ON public.canon_candidate_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_candidate_promotion_transition();

-- ─── Entry lifecycle status transition validation ───
CREATE OR REPLACE FUNCTION public.validate_entry_lifecycle_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.lifecycle_status = NEW.lifecycle_status THEN
    RETURN NEW;
  END IF;

  IF OLD.lifecycle_status = 'active' AND NEW.lifecycle_status NOT IN ('deprecated', 'superseded') THEN
    RAISE EXCEPTION 'Invalid entry lifecycle transition: % → %', OLD.lifecycle_status, NEW.lifecycle_status;
  END IF;

  IF OLD.lifecycle_status IN ('deprecated', 'superseded') AND NEW.lifecycle_status != 'archived' THEN
    RAISE EXCEPTION 'Invalid entry lifecycle transition: % → %', OLD.lifecycle_status, NEW.lifecycle_status;
  END IF;

  IF OLD.lifecycle_status = 'archived' THEN
    RAISE EXCEPTION 'Invalid entry lifecycle transition: archived is terminal';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_entry_lifecycle ON public.canon_entries;
CREATE TRIGGER trg_validate_entry_lifecycle
  BEFORE UPDATE ON public.canon_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_entry_lifecycle_transition();

-- ─── Entry approval status transition validation ───
CREATE OR REPLACE FUNCTION public.validate_entry_approval_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.approval_status = NEW.approval_status THEN
    RETURN NEW;
  END IF;

  IF OLD.approval_status = 'pending' AND NEW.approval_status != 'approved' THEN
    RAISE EXCEPTION 'Invalid entry approval transition: % → %', OLD.approval_status, NEW.approval_status;
  END IF;

  IF OLD.approval_status = 'approved' AND NEW.approval_status != 'revoked' THEN
    RAISE EXCEPTION 'Invalid entry approval transition: % → %', OLD.approval_status, NEW.approval_status;
  END IF;

  IF OLD.approval_status = 'revoked' THEN
    RAISE EXCEPTION 'Invalid entry approval transition: revoked is terminal';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_entry_approval ON public.canon_entries;
CREATE TRIGGER trg_validate_entry_approval
  BEFORE UPDATE ON public.canon_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_entry_approval_transition();

-- ─── Normalize legacy data ───
-- Normalize candidate review status: needs_review → needs_human_review
UPDATE public.canon_candidate_entries
SET internal_validation_status = 'needs_human_review'
WHERE internal_validation_status = 'needs_review';

-- Normalize candidate promotion status: rejected → not_promoted
UPDATE public.canon_candidate_entries
SET promotion_status = 'not_promoted'
WHERE promotion_status = 'rejected';
