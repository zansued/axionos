
-- Add execution progress tracking to initiatives
ALTER TABLE public.initiatives
ADD COLUMN execution_progress jsonb DEFAULT '{}'::jsonb;

-- Enable realtime for initiatives table so frontend can subscribe to progress updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.initiatives;
