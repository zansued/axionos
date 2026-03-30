
-- Fix search_path on the new validation function
CREATE OR REPLACE FUNCTION public.validate_ns_temporal_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.operational_state NOT IN ('nominal', 'elevated', 'stressed', 'pain', 'fatigued', 'recovering', 'critical_cascade') THEN
    RAISE EXCEPTION 'Invalid operational_state: %', NEW.operational_state;
  END IF;
  RETURN NEW;
END;
$$;
