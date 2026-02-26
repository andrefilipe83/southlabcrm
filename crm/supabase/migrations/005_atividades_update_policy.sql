-- ============================================================
-- Permitir UPDATE na descrição de actividades pelo autor
-- ============================================================

CREATE POLICY "Autor pode editar descrição da actividade"
  ON public.atividades
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());
