-- ============================================================
-- Adicionar campos de links aos leads
-- ============================================================

ALTER TABLE public.leads
  ADD COLUMN link_google_maps TEXT,
  ADD COLUMN link_facebook TEXT,
  ADD COLUMN link_instagram TEXT,
  ADD COLUMN link_outros TEXT;
