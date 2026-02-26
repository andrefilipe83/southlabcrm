-- ============================================================
-- Auto-actualizar proxima_acao_em ao completar/cancelar tarefa
-- e ao criar nova tarefa
-- ============================================================

-- 1) Quando uma tarefa é concluída ou cancelada,
--    actualizar proxima_acao_em para a próxima tarefa pendente
--    (ou NULL se não houver)
CREATE OR REPLACE FUNCTION auto_update_proxima_acao()
RETURNS TRIGGER AS $$
DECLARE
  v_lead_id UUID;
  v_proxima_data TIMESTAMPTZ;
BEGIN
  IF NEW.lead_id IS NULL THEN RETURN NEW; END IF;

  v_lead_id := NEW.lead_id;

  -- Encontrar a próxima tarefa pendente deste lead
  SELECT due_at INTO v_proxima_data
  FROM tarefas
  WHERE lead_id = v_lead_id
    AND status = 'pendente'
    AND id != NEW.id
  ORDER BY due_at ASC
  LIMIT 1;

  -- Actualizar o lead (NULL se não houver mais tarefas)
  UPDATE leads
  SET proxima_acao_em = v_proxima_data,
      updated_at = NOW()
  WHERE id = v_lead_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tarefa_concluida
  AFTER UPDATE OF status ON tarefas
  FOR EACH ROW
  WHEN (OLD.status = 'pendente' AND NEW.status IN ('concluida', 'cancelada'))
  EXECUTE FUNCTION auto_update_proxima_acao();

-- 2) Quando uma nova tarefa pendente é criada,
--    actualizar proxima_acao_em se for mais próxima ou se não existia
CREATE OR REPLACE FUNCTION auto_update_proxima_acao_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lead_id IS NULL OR NEW.status != 'pendente' THEN RETURN NEW; END IF;

  UPDATE leads
  SET proxima_acao_em = NEW.due_at,
      updated_at = NOW()
  WHERE id = NEW.lead_id
    AND (proxima_acao_em IS NULL OR NEW.due_at < proxima_acao_em);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tarefa_criada
  AFTER INSERT ON tarefas
  FOR EACH ROW
  WHEN (NEW.status = 'pendente' AND NEW.lead_id IS NOT NULL)
  EXECUTE FUNCTION auto_update_proxima_acao_on_insert();
