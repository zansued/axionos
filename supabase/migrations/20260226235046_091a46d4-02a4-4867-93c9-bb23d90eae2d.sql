
CREATE OR REPLACE FUNCTION public.log_audit_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  entity_label text;
BEGIN
  -- Safely get a label from common columns
  BEGIN
    entity_label := NEW.title;
  EXCEPTION WHEN undefined_column THEN
    entity_label := NULL;
  END;

  IF entity_label IS NULL THEN
    BEGIN
      entity_label := NEW.name;
    EXCEPTION WHEN undefined_column THEN
      entity_label := NULL;
    END;
  END IF;

  IF entity_label IS NULL THEN
    entity_label := NEW.id::text;
  END IF;

  INSERT INTO public.audit_logs (user_id, action, category, entity_type, entity_id, message, severity)
  VALUES (
    COALESCE(NEW.user_id, auth.uid()),
    TG_ARGV[0],
    TG_ARGV[1],
    TG_TABLE_NAME,
    NEW.id,
    TG_ARGV[0] || ' on ' || TG_TABLE_NAME || ': ' || entity_label,
    'info'
  );
  RETURN NEW;
END;
$function$;
