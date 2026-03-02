-- ============================================================
-- Fix: adicionar 'nao_sabe' ao enum servico_lead,
-- tornar trigger de mudança de etapa mais robusto,
-- e corrigir recursão entre triggers (leads ↔ tarefas)
-- ============================================================

-- 1) Adicionar valor 'nao_sabe' ao enum servico_lead
ALTER TYPE servico_lead ADD VALUE IF NOT EXISTS 'nao_sabe';

-- 2) Tornar o trigger de mudança de etapa mais robusto:
--    - Só criar tarefa se owner_id não for NULL
--    - Definir proxima_acao_em directamente no NEW (evita recursão)
CREATE OR REPLACE FUNCTION auto_tarefa_mudanca_etapa()
RETURNS TRIGGER AS $$
DECLARE
  v_due TIMESTAMPTZ;
BEGIN
  IF OLD.etapa IS DISTINCT FROM NEW.etapa THEN

    -- Só criar tarefas automáticas se o lead tiver responsável
    IF NEW.owner_id IS NOT NULL THEN

      IF NEW.etapa = 'reuniao_marcada' THEN
        v_due := NOW() + INTERVAL '1 hour';
        INSERT INTO public.tarefas (lead_id, titulo, due_at, assigned_to, prioridade)
        VALUES (NEW.id, 'Enviar confirmação de reunião a ' || NEW.nome, v_due, NEW.owner_id, 'alta');
        -- Actualizar proxima_acao_em directamente (sem UPDATE separado)
        IF NEW.proxima_acao_em IS NULL OR v_due < NEW.proxima_acao_em THEN
          NEW.proxima_acao_em = v_due;
        END IF;
      END IF;

      IF NEW.etapa = 'proposta_enviada' THEN
        v_due := NOW() + INTERVAL '2 days';
        INSERT INTO public.tarefas (lead_id, titulo, due_at, assigned_to, prioridade)
        VALUES (NEW.id, 'Follow-up proposta enviada a ' || NEW.nome, v_due, NEW.owner_id, 'alta');
        IF NEW.proxima_acao_em IS NULL OR v_due < NEW.proxima_acao_em THEN
          NEW.proxima_acao_em = v_due;
        END IF;
      END IF;

      IF NEW.etapa = 'ganho' THEN
        v_due := NOW() + INTERVAL '1 day';
        INSERT INTO public.tarefas (lead_id, titulo, due_at, assigned_to, prioridade)
        VALUES (NEW.id, 'Iniciar onboarding de ' || NEW.nome || ' (' || COALESCE(NEW.empresa, '') || ')', v_due, NEW.owner_id, 'alta');
        IF NEW.proxima_acao_em IS NULL OR v_due < NEW.proxima_acao_em THEN
          NEW.proxima_acao_em = v_due;
        END IF;
      END IF;

    END IF;

    -- Registar actividade de mudança de etapa (sempre)
    INSERT INTO public.atividades (lead_id, tipo, descricao, created_by)
    VALUES (
      NEW.id,
      'nota',
      'Etapa alterada de "' || OLD.etapa || '" para "' || NEW.etapa || '"',
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3) Corrigir trigger de tarefas para não tentar UPDATE no lead
--    quando já estamos dentro de um trigger do lead (evita recursão)
CREATE OR REPLACE FUNCTION auto_update_proxima_acao_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.lead_id IS NULL OR NEW.status != 'pendente' THEN RETURN NEW; END IF;

  -- Saltar se estamos dentro de outro trigger (ex: mudança de etapa)
  -- pg_trigger_depth() > 1 = trigger encadeado
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;

  UPDATE leads
  SET proxima_acao_em = NEW.due_at,
      updated_at = NOW()
  WHERE id = NEW.lead_id
    AND (proxima_acao_em IS NULL OR NEW.due_at < proxima_acao_em);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
