-- ============================================================
-- Fix: adicionar 'nao_sabe' ao enum servico_lead
-- e tornar trigger de mudança de etapa mais robusto
-- ============================================================

-- 1) Adicionar valor 'nao_sabe' ao enum servico_lead
ALTER TYPE servico_lead ADD VALUE IF NOT EXISTS 'nao_sabe';

-- 2) Tornar o trigger de mudança de etapa mais robusto:
--    Só criar tarefa se owner_id não for NULL
CREATE OR REPLACE FUNCTION auto_tarefa_mudanca_etapa()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.etapa IS DISTINCT FROM NEW.etapa THEN

    -- Só criar tarefas automáticas se o lead tiver responsável
    IF NEW.owner_id IS NOT NULL THEN

      IF NEW.etapa = 'reuniao_marcada' THEN
        INSERT INTO public.tarefas (lead_id, titulo, due_at, assigned_to, prioridade)
        VALUES (
          NEW.id,
          'Enviar confirmação de reunião a ' || NEW.nome,
          NOW() + INTERVAL '1 hour',
          NEW.owner_id,
          'alta'
        );
      END IF;

      IF NEW.etapa = 'proposta_enviada' THEN
        INSERT INTO public.tarefas (lead_id, titulo, due_at, assigned_to, prioridade)
        VALUES (
          NEW.id,
          'Follow-up proposta enviada a ' || NEW.nome,
          NOW() + INTERVAL '2 days',
          NEW.owner_id,
          'alta'
        );
        NEW.proxima_acao_em = NOW() + INTERVAL '2 days';
      END IF;

      IF NEW.etapa = 'ganho' THEN
        INSERT INTO public.tarefas (lead_id, titulo, due_at, assigned_to, prioridade)
        VALUES (
          NEW.id,
          'Iniciar onboarding de ' || NEW.nome || ' (' || COALESCE(NEW.empresa, '') || ')',
          NOW() + INTERVAL '1 day',
          NEW.owner_id,
          'alta'
        );
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
