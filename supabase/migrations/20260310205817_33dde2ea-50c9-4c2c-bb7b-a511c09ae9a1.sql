ALTER TABLE public.canon_pattern_embeddings
  ADD CONSTRAINT canon_pattern_embeddings_canon_entry_id_fkey
  FOREIGN KEY (canon_entry_id) REFERENCES public.canon_entries(id) ON DELETE CASCADE;