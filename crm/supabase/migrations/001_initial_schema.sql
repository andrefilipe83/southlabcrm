-- ============================================================
-- CRM South Lab Tech — Schema Inicial
-- Executar no SQL Editor do Supabase (uma vez)
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE etapa_lead AS ENUM (
  'novo',
  'a_contactar',
  'contactado',
  'reuniao_marcada',
  'proposta_enviada',
  'ganho',
  'perdido'
);

CREATE TYPE origem_lead AS ENUM (
  'formulario_site',
  'whatsapp',
  'chamada',
  'google_ads',
  'facebook_ads',
  'email',
  'referencia',
  'organico',
  'outro'
);

CREATE TYPE servico_lead AS ENUM (
  'website',
  'website_reservas',
  'loja_online',
  'seo',
  'multiplos'
);

CREATE TYPE tipo_atividade AS ENUM (
  'chamada',
  'whatsapp',
  'email',
  'reuniao',
  'nota',
  'formulario',
  'outro'
);

-- ============================================================
-- TABELA: profiles
-- Estende auth.users — criada via trigger no signup
-- ============================================================

CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nome TEXT NOT NULL,
  papel TEXT NOT NULL CHECK (papel IN ('admin', 'vendas')),
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles visíveis para utilizadores autenticados"
  ON public.profiles FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Utilizador actualiza o próprio perfil"
  ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id);

-- ============================================================
-- TABELA: leads
-- ============================================================

CREATE TABLE public.leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  empresa TEXT,
  email TEXT,
  telefone TEXT,
  origem origem_lead NOT NULL DEFAULT 'outro',
  cidade TEXT,
  servico servico_lead,
  etapa etapa_lead NOT NULL DEFAULT 'novo',
  valor_estimado DECIMAL(10,2),
  owner_id UUID REFERENCES public.profiles(id),
  proxima_acao_em TIMESTAMPTZ,
  notas TEXT,
  tags TEXT[] DEFAULT '{}',
  estado TEXT NOT NULL CHECK (estado IN ('ativo', 'arquivado')) DEFAULT 'ativo',
  motivo_perda TEXT,
  base_legal TEXT DEFAULT 'interesse_legitimo'
    CHECK (base_legal IN ('interesse_legitimo', 'consentimento_formulario', 'consentimento_outro')),
  dados_anonimizados BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices
CREATE INDEX idx_leads_etapa ON public.leads(etapa);
CREATE INDEX idx_leads_owner ON public.leads(owner_id);
CREATE INDEX idx_leads_proxima_acao ON public.leads(proxima_acao_em);
CREATE INDEX idx_leads_estado ON public.leads(estado);
CREATE INDEX idx_leads_origem ON public.leads(origem);
CREATE INDEX idx_leads_created ON public.leads(created_at);

-- RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leads visíveis para utilizadores autenticados"
  ON public.leads FOR SELECT TO authenticated USING (true);

CREATE POLICY "Leads criáveis por utilizadores autenticados"
  ON public.leads FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Leads actualizáveis por utilizadores autenticados"
  ON public.leads FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Leads elimináveis por utilizadores autenticados"
  ON public.leads FOR DELETE TO authenticated
  USING (true);

-- ============================================================
-- TABELA: atividades
-- ============================================================

CREATE TABLE public.atividades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  tipo tipo_atividade NOT NULL,
  descricao TEXT NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_atividades_lead ON public.atividades(lead_id);
CREATE INDEX idx_atividades_created ON public.atividades(created_at);

ALTER TABLE public.atividades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Atividades visíveis para autenticados"
  ON public.atividades FOR SELECT TO authenticated USING (true);

CREATE POLICY "Atividades criáveis por autenticados"
  ON public.atividades FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- TABELA: tarefas
-- ============================================================

CREATE TABLE public.tarefas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  titulo TEXT NOT NULL,
  descricao TEXT,
  due_at TIMESTAMPTZ NOT NULL,
  assigned_to UUID REFERENCES public.profiles(id) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pendente', 'concluida', 'cancelada')) DEFAULT 'pendente',
  prioridade TEXT NOT NULL CHECK (prioridade IN ('baixa', 'media', 'alta')) DEFAULT 'media',
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_tarefas_assigned ON public.tarefas(assigned_to);
CREATE INDEX idx_tarefas_due ON public.tarefas(due_at);
CREATE INDEX idx_tarefas_status ON public.tarefas(status);
CREATE INDEX idx_tarefas_lead ON public.tarefas(lead_id);

ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tarefas visíveis para autenticados"
  ON public.tarefas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Tarefas criáveis por autenticados"
  ON public.tarefas FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Tarefas actualizáveis por autenticados"
  ON public.tarefas FOR UPDATE TO authenticated USING (true);

-- ============================================================
-- TRIGGER: updated_at automático
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- TRIGGER: qualificar lead ao criar (executa primeiro — nome alfabético)
-- ============================================================

CREATE OR REPLACE FUNCTION auto_qualificar_lead()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.origem IN ('google_ads', 'facebook_ads')
     AND NEW.servico IN ('website_reservas', 'loja_online') THEN
    NEW.tags = array_append(NEW.tags, 'alta_intencao');
  END IF;

  IF NEW.origem IN ('google_ads', 'facebook_ads') THEN
    NEW.tags = array_append(NEW.tags, 'pago');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_qualificar_lead
  BEFORE INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION auto_qualificar_lead();

-- ============================================================
-- TRIGGER: criar tarefa automática ao inserir novo lead
-- ============================================================

CREATE OR REPLACE FUNCTION auto_tarefa_novo_lead()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.etapa = 'novo' AND NEW.owner_id IS NOT NULL THEN
    INSERT INTO public.tarefas (lead_id, titulo, due_at, assigned_to, prioridade)
    VALUES (
      NEW.id,
      'Contactar novo lead: ' || NEW.nome,
      NOW() + INTERVAL '24 hours',
      NEW.owner_id,
      CASE
        WHEN NEW.origem IN ('google_ads', 'facebook_ads') THEN 'alta'
        ELSE 'media'
      END
    );

    IF NEW.proxima_acao_em IS NULL THEN
      NEW.proxima_acao_em = NOW() + INTERVAL '24 hours';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_novo_lead
  BEFORE INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION auto_tarefa_novo_lead();

-- ============================================================
-- TRIGGER: tarefas automáticas ao mudar etapa
-- ============================================================

CREATE OR REPLACE FUNCTION auto_tarefa_mudanca_etapa()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.etapa IS DISTINCT FROM NEW.etapa THEN

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

CREATE TRIGGER trigger_mudanca_etapa
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION auto_tarefa_mudanca_etapa();

-- ============================================================
-- VIEWS
-- ============================================================

CREATE VIEW leads_sem_proxima_acao AS
SELECT l.*, p.nome AS owner_nome
FROM leads l
LEFT JOIN profiles p ON l.owner_id = p.id
WHERE l.estado = 'ativo'
  AND l.etapa NOT IN ('ganho', 'perdido')
  AND l.proxima_acao_em IS NULL;

CREATE VIEW leads_atrasados AS
SELECT l.*, p.nome AS owner_nome,
  NOW() - l.proxima_acao_em AS tempo_atraso
FROM leads l
LEFT JOIN profiles p ON l.owner_id = p.id
WHERE l.estado = 'ativo'
  AND l.etapa NOT IN ('ganho', 'perdido')
  AND l.proxima_acao_em < NOW();

CREATE VIEW stats_pipeline AS
SELECT
  etapa,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE proxima_acao_em < NOW()) AS atrasados,
  COALESCE(SUM(valor_estimado), 0) AS valor_total
FROM leads
WHERE estado = 'ativo'
GROUP BY etapa;

CREATE VIEW tarefas_hoje AS
SELECT t.*, l.nome AS lead_nome, l.empresa AS lead_empresa, p.nome AS assigned_nome
FROM tarefas t
JOIN leads l ON t.lead_id = l.id
LEFT JOIN profiles p ON t.assigned_to = p.id
WHERE t.status = 'pendente'
  AND t.due_at::date <= CURRENT_DATE
ORDER BY t.prioridade DESC, t.due_at ASC;

CREATE VIEW leads_para_anonimizar AS
SELECT l.id, l.nome, l.estado, l.updated_at,
  NOW() - l.updated_at AS tempo_inativo
FROM leads l
WHERE l.estado = 'arquivado'
  AND l.dados_anonimizados = false
  AND l.updated_at < NOW() - INTERVAL '24 months';

-- ============================================================
-- FUNÇÃO: anonimizar lead (RGPD)
-- ============================================================

CREATE OR REPLACE FUNCTION anonimizar_lead(lead_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.leads SET
    nome = '[DADOS REMOVIDOS]',
    empresa = NULL,
    email = NULL,
    telefone = NULL,
    cidade = NULL,
    notas = NULL,
    dados_anonimizados = true,
    estado = 'arquivado',
    updated_at = now()
  WHERE id = lead_uuid;

  UPDATE public.atividades SET
    descricao = '[DADOS REMOVIDOS]'
  WHERE lead_id = lead_uuid;

  UPDATE public.tarefas SET
    titulo = '[DADOS REMOVIDOS]',
    descricao = NULL
  WHERE lead_id = lead_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- INSERÇÃO INICIAL DE PROFILES
-- Substituir os UUIDs pelos valores reais após criar utilizadores
-- no Supabase Authentication > Users > Add User
-- ============================================================

-- INSERT INTO public.profiles (id, nome, papel, email) VALUES
--   ('<uuid-admin>', 'Nome Admin', 'admin', 'admin@example.com'),
--   ('<uuid-vendas>', 'Nome Vendas', 'vendas', 'vendas@example.com');
