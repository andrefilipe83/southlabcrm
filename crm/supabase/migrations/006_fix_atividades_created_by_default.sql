-- ============================================================
-- Fix: adicionar default auth.uid() a created_by em atividades
-- para que o autor seja preenchido automaticamente
-- ============================================================

ALTER TABLE public.atividades
  ALTER COLUMN created_by SET DEFAULT auth.uid();
