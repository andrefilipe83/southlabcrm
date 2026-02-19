# Blueprint CRM — Agência de Web Design & Marketing Digital

## Contexto do Projecto

CRM custom para uma agência de web design e marketing digital, operada por 2 pessoas:
- **Utilizador 1 (Admin/Operações)**: Cria leads, importa dados, gere configurações, garante qualidade dos dados
- **Utilizador 2 (Vendas/Contactos)**: Contacta leads, regista interacções, agenda reuniões, faz follow-ups

**Volume**: 50-100 leads novos/mês  
**Serviços vendidos**: Website, Website + Sistema de Reservas, Loja Online / E-commerce, SEO  
**Canais de entrada de leads**: Formulário do site, WhatsApp, Chamadas telefónicas, Google Ads / Facebook Ads, Email  
**Idioma da interface**: Português (Portugal)  
**Notificações**: Email + WhatsApp (para os 2 utilizadores)

---

## Stack Técnica

| Camada | Tecnologia | Plano | Notas |
|--------|-----------|-------|-------|
| **Base de dados + Auth + API** | Supabase | Free (500MB DB, 50k rows, 5GB storage) | PostgreSQL, Row Level Security, API REST auto |
| **Frontend** | Next.js 14+ (App Router) | — | React, Server Components, TypeScript |
| **Hosting frontend** | Vercel | Free (hobby) | Deploy automático via Git |
| **Automações (futuro)** | Supabase Edge Functions / n8n | Free / self-host | Fase 2 — inicialmente lógica no frontend/DB |
| **Notificações email** | Resend | Free (100 emails/dia) | API simples, bom para notificações |
| **UI Components** | shadcn/ui + Tailwind CSS | — | Componentes acessíveis e bonitos |
| **Drag & Drop (Kanban)** | @dnd-kit/core | — | Leve, acessível, bem mantido |
| **Ícones** | Lucide React | — | Consistente com shadcn |

---

## Base de Dados — Schema Supabase (PostgreSQL)

### Tabela `profiles`

Estende o auth.users do Supabase. Criada automaticamente via trigger on signup.

```sql
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  nome TEXT NOT NULL,
  papel TEXT NOT NULL CHECK (papel IN ('admin', 'vendas')),
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: cada utilizador vê todos os profiles (são só 2)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles visíveis para utilizadores autenticados"
  ON public.profiles FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "Utilizador actualiza o próprio perfil"
  ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id);
```

### Tabela `leads`

```sql
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
  motivo_perda TEXT, -- preenchido quando etapa = 'perdido'
  base_legal TEXT DEFAULT 'interesse_legitimo'
    CHECK (base_legal IN ('interesse_legitimo', 'consentimento_formulario', 'consentimento_outro')),
  dados_anonimizados BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_leads_etapa ON public.leads(etapa);
CREATE INDEX idx_leads_owner ON public.leads(owner_id);
CREATE INDEX idx_leads_proxima_acao ON public.leads(proxima_acao_em);
CREATE INDEX idx_leads_estado ON public.leads(estado);
CREATE INDEX idx_leads_origem ON public.leads(origem);
CREATE INDEX idx_leads_created ON public.leads(created_at);

-- RLS: ambos os utilizadores vêem todos os leads
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leads visíveis para utilizadores autenticados"
  ON public.leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leads editáveis por utilizadores autenticados"
  ON public.leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Leads actualizáveis por utilizadores autenticados"
  ON public.leads FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Leads elimináveis por admins"
  ON public.leads FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.papel = 'admin'
    )
  );

-- Trigger para updated_at automático
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
```

### Tabela `atividades` (Timeline de interacções)

```sql
CREATE TYPE tipo_atividade AS ENUM (
  'chamada',
  'whatsapp',
  'email',
  'reuniao',
  'nota',
  'formulario',
  'outro'
);

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
```

### Tabela `tarefas`

```sql
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
```

### Views úteis (criar no Supabase)

```sql
-- Leads sem próxima acção definida (ALERTA!)
CREATE VIEW leads_sem_proxima_acao AS
SELECT l.*, p.nome AS owner_nome
FROM leads l
LEFT JOIN profiles p ON l.owner_id = p.id
WHERE l.estado = 'ativo'
  AND l.etapa NOT IN ('ganho', 'perdido')
  AND l.proxima_acao_em IS NULL;

-- Leads com follow-up atrasado
CREATE VIEW leads_atrasados AS
SELECT l.*, p.nome AS owner_nome,
  NOW() - l.proxima_acao_em AS tempo_atraso
FROM leads l
LEFT JOIN profiles p ON l.owner_id = p.id
WHERE l.estado = 'ativo'
  AND l.etapa NOT IN ('ganho', 'perdido')
  AND l.proxima_acao_em < NOW();

-- Contadores por etapa (para dashboard simples)
CREATE VIEW stats_pipeline AS
SELECT
  etapa,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE proxima_acao_em < NOW()) AS atrasados,
  COALESCE(SUM(valor_estimado), 0) AS valor_total
FROM leads
WHERE estado = 'ativo'
GROUP BY etapa;

-- Tarefas de hoje para cada utilizador
CREATE VIEW tarefas_hoje AS
SELECT t.*, l.nome AS lead_nome, l.empresa AS lead_empresa, p.nome AS assigned_nome
FROM tarefas t
JOIN leads l ON t.lead_id = l.id
LEFT JOIN profiles p ON t.assigned_to = p.id
WHERE t.status = 'pendente'
  AND t.due_at::date <= CURRENT_DATE
ORDER BY t.prioridade DESC, t.due_at ASC;
```

### Funções de base de dados (automações server-side)

```sql
-- Função: ao criar lead, criar tarefa automática "Contactar em 24h"
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

    -- Actualizar proxima_acao_em se não definida
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

-- Função: ao mudar etapa, criar tarefas automáticas
CREATE OR REPLACE FUNCTION auto_tarefa_mudanca_etapa()
RETURNS TRIGGER AS $$
BEGIN
  -- Só executar se a etapa mudou
  IF OLD.etapa IS DISTINCT FROM NEW.etapa THEN

    -- Reunião marcada → criar tarefa de confirmação
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

    -- Proposta enviada → criar tarefa de follow-up
    IF NEW.etapa = 'proposta_enviada' THEN
      INSERT INTO public.tarefas (lead_id, titulo, due_at, assigned_to, prioridade)
      VALUES (
        NEW.id,
        'Follow-up proposta enviada a ' || NEW.nome,
        NOW() + INTERVAL '2 days',
        NEW.owner_id,
        'alta'
      );
      -- Actualizar proxima_acao_em
      NEW.proxima_acao_em = NOW() + INTERVAL '2 days';
    END IF;

    -- Ganho → criar tarefa de onboarding
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

    -- Registar mudança de etapa como actividade
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

-- Função: qualificação automática por tags
CREATE OR REPLACE FUNCTION auto_qualificar_lead()
RETURNS TRIGGER AS $$
BEGIN
  -- Alta intenção: vem de ads + quer website com reservas ou loja
  IF NEW.origem IN ('google_ads', 'facebook_ads')
     AND NEW.servico IN ('website_reservas', 'loja_online') THEN
    NEW.tags = array_append(NEW.tags, 'alta_intencao');
  END IF;

  -- Marcar origem paga
  IF NEW.origem IN ('google_ads', 'facebook_ads') THEN
    NEW.tags = array_append(NEW.tags, 'pago');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_qualificar_lead
  BEFORE INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION auto_qualificar_lead();
```

---

## Ecrãs / Páginas do Frontend

A aplicação Next.js deve ter as seguintes páginas e componentes.

### 1. Login (`/login`)

- Formulário simples: email + password
- Autenticação via Supabase Auth (`signInWithPassword`)
- Redirect para `/dashboard` após login
- Sem registo público — os 2 utilizadores são criados manualmente no Supabase

### 2. Dashboard (`/dashboard`)

Página principal após login. Mostra visão geral do dia.

**Componentes:**
- **Cartões de resumo** (em cima):
  - Total de leads activos
  - Leads sem próxima acção (ALERTA, vermelho se > 0)
  - Leads com follow-up atrasado (ALERTA, vermelho se > 0)
  - Tarefas pendentes para hoje
  - Valor total estimado no pipeline (soma de valor_estimado dos leads activos)
- **Lista "As minhas tarefas de hoje"**: tarefas do utilizador com due_at <= hoje, ordenadas por prioridade. Cada tarefa tem checkbox para marcar como concluída, nome do lead clicável, e data/hora.
- **Lista "Leads que precisam de atenção"**: combina leads_sem_proxima_acao e leads_atrasados, limite de 10, com link para o lead.
- **Actividade recente** (últimas 10 actividades globais) — mostra quem fez o quê e quando.

### 3. Pipeline / Kanban (`/pipeline`)

Vista kanban com colunas por etapa. **Só mostra leads com estado = 'ativo'.**

**Colunas (da esquerda para a direita):**
1. Novo
2. A Contactar
3. Contactado
4. Reunião Marcada
5. Proposta Enviada
6. Ganho ✅
7. Perdido ❌

**Cada card de lead mostra:**
- Nome + empresa (se existir)
- Serviço pretendido (badge colorido)
- Origem (ícone pequeno)
- Owner (avatar/iniciais)
- Próxima acção (data, a vermelho se atrasada)
- Valor estimado (se preenchido)
- Tag "alta_intencao" se presente (badge dourado)

**Interacções:**
- Drag & drop entre colunas → actualiza etapa do lead (dispara trigger de automação)
- Ao mover para "Perdido" → abrir modal a pedir motivo_perda (campo obrigatório)
- Click no card → navega para detalhe do lead
- Filtros no topo: por owner, por origem, por serviço, por tag

### 4. Lista de Leads (`/leads`)

Vista em tabela com todas as funcionalidades de pesquisa e filtro.

**Colunas da tabela:**
- Nome
- Empresa
- Serviço
- Etapa (badge colorido)
- Origem
- Owner
- Próxima acção (data)
- Valor estimado
- Criado em

**Funcionalidades:**
- Pesquisa global (nome, empresa, email, telefone)
- Filtros combinados: etapa, origem, serviço, owner, estado (ativo/arquivado), tags, intervalo de datas
- Ordenação por qualquer coluna
- Botão "Novo Lead" → abre modal/drawer de criação
- Exportar para CSV
- Acções em massa: atribuir owner, mudar etapa, arquivar

### 5. Detalhe do Lead (`/leads/[id]`)

Página completa de um lead individual.

**Layout em 2 colunas:**

**Coluna esquerda (60%) — Informação + Timeline:**
- Cabeçalho: nome, empresa, etapa (dropdown editável), owner (dropdown editável)
- Campos editáveis inline: email, telefone, cidade, origem, serviço, valor_estimado, notas
- Botões de acção rápida:
  - 📞 "Abrir WhatsApp" → `https://wa.me/<telefone_limpo>?text=Olá ${nome}, ...`
  - 📧 "Enviar Email" → `mailto:${email}?subject=...`
  - 📋 "Nova Tarefa" → modal rápido
  - 📝 "Registar Actividade" → modal rápido
- **Timeline de actividades** (cronológica, mais recente primeiro):
  - Cada entrada mostra: ícone do tipo, descrição, quem criou, quando
  - Inclui actividades manuais E automáticas (mudanças de etapa)
  - Botão para adicionar actividade rápida no topo (tipo + descrição, 2 campos apenas)

**Coluna direita (40%) — Tarefas + Detalhes:**
- Lista de tarefas associadas ao lead (pendentes primeiro, depois concluídas)
- Cada tarefa: título, data, assignee, prioridade, checkbox para concluir
- Botão "Nova Tarefa"
- Tags do lead (editáveis)
- Datas: criado em, actualizado em
- Se etapa = perdido: mostrar motivo_perda

### 6. Tarefas (`/tarefas`)

Vista focada em tarefas, ideal para o dia-a-dia da utilizadora de vendas.

**Separadores:**
- **Hoje**: tarefas com due_at <= hoje, pendentes
- **Esta semana**: tarefas com due_at nos próximos 7 dias
- **Atrasadas**: tarefas pendentes com due_at no passado (ALERTA vermelho)
- **Todas**: vista completa com filtros

**Cada tarefa mostra:**
- Título (clicável → vai para o lead)
- Lead associado (nome + empresa)
- Data/hora de vencimento
- Prioridade (badge)
- Checkbox para marcar como concluída
- Ao concluir → perguntar "Qual é a próxima acção?" com opção de criar nova tarefa imediatamente

**Filtros:** por assignee, prioridade, status

### 7. Integração com formulário do site (FASE 2 — não incluir no MVP)

O site da agência já tem formulário próprio com checkbox de consentimento RGPD. Numa fase futura, pode-se criar um endpoint API (`/api/lead`) para receber leads automaticamente do formulário do site via webhook. Por agora, os leads são todos inseridos manualmente no CRM.

---

## Automações (Implementadas via Database Triggers)

Todas as automações abaixo já estão definidas no schema SQL acima. Resumo:

| Trigger | Quando | Acção |
|---------|--------|-------|
| `trigger_novo_lead` | Lead criado com etapa 'novo' | Cria tarefa "Contactar em 24h" atribuída ao owner. Prioridade alta se origem = ads. |
| `trigger_mudanca_etapa` | Etapa do lead alterada | Reunião marcada → tarefa "Enviar confirmação" (1h). Proposta enviada → tarefa "Follow-up" (2 dias). Ganho → tarefa "Onboarding" (1 dia). Regista actividade automática. |
| `trigger_qualificar_lead` | Lead criado | Adiciona tag 'alta_intencao' se ads + reservas/loja. Adiciona tag 'pago' se ads. |
| `update_updated_at` | Lead actualizado | Actualiza campo updated_at automaticamente. |

### Automações Fase 2 (para implementar com Edge Functions ou n8n, mais tarde)

Estas NÃO fazem parte do MVP mas devem ser consideradas na arquitectura:

- **Alerta diário por email**: "Tens X leads sem follow-up nas próximas 24h" (cron job diário às 8h)
- **Alerta de inactividade**: "Lead X está parado há 3+ dias em 'a_contactar'" (cron job diário)
- **Notificação WhatsApp** via API do WhatsApp Business quando lead novo entra
- **Lembrete de reunião**: "Reunião amanhã às 10h — confirma link e agenda" (cron baseado em tarefas)
- **Relatório semanal**: resumo automático por email com métricas do pipeline
- **Integração com formulário do site**: endpoint API para receber leads automaticamente via webhook

---

## Regras de Negócio Importantes

1. **Nenhum lead activo pode ficar sem `proxima_acao_em`** — o frontend deve mostrar alerta visual (badge vermelho) quando este campo está vazio e o lead não está em 'ganho' ou 'perdido'.
2. **Ao concluir uma tarefa, perguntar sempre "Qual é a próxima acção?"** — manter o ciclo de follow-up contínuo.
3. **Motivo de perda é obrigatório** — ao mover lead para 'perdido', forçar preenchimento.
4. **Leads nunca são apagados** — são arquivados (estado = 'arquivado').
5. **Toda a interacção deve ser registada** — mesmo que seja "tentei ligar, não atendeu".

---

## Segurança e RGPD

### Conformidade RGPD (obrigatório para operação em Portugal)

O CRM armazena dados pessoais (nome, email, telefone, empresa) de potenciais clientes. Ao abrigo do Regulamento Geral de Proteção de Dados (RGPD), é necessário cumprir o seguinte:

#### 1. Base legal para o tratamento de dados

Os leads que vos contactam via WhatsApp, email, chamada ou formulário do site iniciam o contacto comercial — a base legal é o **interesse legítimo** (artigo 6.º, alínea f) do RGPD) para tratamento dos dados no contexto de follow-up comercial. O formulário do vosso site já tem checkbox de consentimento RGPD, o que reforça a base legal para leads que entram por aí.

Como os leads são inseridos manualmente no CRM (não há formulário público ligado ao CRM), não é necessário checkbox no CRM. No entanto, é boa prática registar a origem do consentimento:

Os campos `base_legal` e `dados_anonimizados` já estão incluídos no CREATE TABLE principal da tabela `leads`. O campo `base_legal` permite distinguir entre leads que vos contactaram (interesse legítimo) e leads que deram consentimento explícito via formulário do site.

#### 2. Direitos dos titulares dos dados

O CRM deve suportar os seguintes direitos (podem ser executados manualmente pelo admin no MVP, mas devem estar previstos):

| Direito | Implementação |
|---------|--------------|
| **Direito de acesso** | O admin pode exportar todos os dados de um lead em JSON/CSV a partir da página de detalhe do lead. Botão "Exportar dados pessoais". |
| **Direito de rectificação** | Já suportado — os campos são editáveis na página de detalhe. |
| **Direito ao apagamento ("ser esquecido")** | Função de anonimização: substituir nome, email, telefone, empresa, cidade e notas por "[DADOS REMOVIDOS]". NÃO apagar o registo (mantém integridade da base de dados e métricas). Marcar `dados_anonimizados = true`. |
| **Direito à portabilidade** | Coberto pela exportação JSON/CSV. |
| **Direito de oposição** | Marcar lead como arquivado + remover de qualquer lista de contacto activa. |

**Função SQL de anonimização:**

```sql
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

  -- Anonimizar actividades associadas
  UPDATE public.atividades SET
    descricao = '[DADOS REMOVIDOS]'
  WHERE lead_id = lead_uuid;

  -- Anonimizar tarefas associadas
  UPDATE public.tarefas SET
    titulo = '[DADOS REMOVIDOS]',
    descricao = NULL
  WHERE lead_id = lead_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**No frontend — página de detalhe do lead:**
- Botão "Exportar dados pessoais" (gera JSON com todos os dados do lead + actividades + tarefas)
- Botão "Anonimizar dados" (só admin) com confirmação dupla: "Esta acção é irreversível. Tens a certeza?"
- Se `dados_anonimizados = true`, mostrar aviso visual no lead e impedir edição

#### 3. Retenção de dados

Definir e implementar política de retenção:

- **Leads activos**: sem limite de retenção enquanto houver relação comercial
- **Leads perdidos/arquivados**: reter durante 24 meses após último contacto, depois anonimizar automaticamente
- **Implementação futura (Fase 2)**: cron job mensal que identifica leads arquivados há mais de 24 meses sem actividade e executa `anonimizar_lead()`

**Adicionar ao schema:**

```sql
-- View para leads candidatos a anonimização
CREATE VIEW leads_para_anonimizar AS
SELECT l.id, l.nome, l.estado, l.updated_at,
  NOW() - l.updated_at AS tempo_inativo
FROM leads l
WHERE l.estado = 'arquivado'
  AND l.dados_anonimizados = false
  AND l.updated_at < NOW() - INTERVAL '24 months';
```

#### 4. Registo de actividades de tratamento

O RGPD exige um registo das actividades de tratamento. Criar um documento (pode ser uma página simples no CRM ou um ficheiro) com:

- **Responsável pelo tratamento**: [Nome da Agência], NIF, morada
- **Finalidade**: Gestão de contactos comerciais e follow-up de potenciais clientes
- **Categorias de dados**: Nome, email, telefone, empresa, cidade, historial de interacções
- **Base legal**: Consentimento (formulário) / Interesse legítimo (contacto iniciado pelo titular)
- **Prazo de conservação**: Enquanto houver relação comercial activa; 24 meses após arquivo
- **Medidas de segurança**: Autenticação, RLS, encriptação em trânsito (HTTPS), backups

#### 5. Segurança técnica

**Já implementado no blueprint:**
- ✅ Autenticação obrigatória (Supabase Auth)
- ✅ Row Level Security (RLS) — dados só acessíveis a utilizadores autenticados
- ✅ Sem registo público — utilizadores criados manualmente
- ✅ HTTPS em trânsito (Vercel + Supabase fornecem por defeito)

**Adicionar ao desenvolvimento:**
- ✅ **Rate limiting no endpoint público** (`/api/lead`): máximo 10 submissões por IP por hora
- ✅ **Validação e sanitização de inputs**: todos os campos do formulário público devem ser sanitizados contra XSS e SQL injection (o Supabase client já protege contra SQL injection, mas sanitizar HTML no input)
- ✅ **Headers de segurança no Next.js** (`next.config.js`):

```javascript
// next.config.js
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

module.exports = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};
```

- ✅ **Backups**: Supabase free faz backups diários automáticos (retenção de 7 dias). Para segurança extra, configurar exportação semanal manual ou via pg_dump.
- ✅ **Variáveis de ambiente**: nunca expor service_role key no frontend. Usar apenas anon key no browser e service_role key apenas no servidor (API routes).
- ✅ **Sessões**: Supabase Auth gere sessões com JWT. Tokens expiram automaticamente. Implementar logout automático após inactividade (30 minutos sugerido).

#### 6. Checklist de conformidade antes de lançar

- [ ] Política de Privacidade publicada no site da agência
- [ ] Função de exportação de dados pessoais operacional
- [ ] Função de anonimização operacional
- [ ] Registo de actividades de tratamento documentado
- [ ] Backups verificados
- [ ] Headers de segurança activos (verificar em securityheaders.com)
- [ ] Confirmar que os dados estão alojados na EU (Supabase permite escolher região — seleccionar Frankfurt ou similar)
- [ ] Logout automático por inactividade testado

**IMPORTANTE sobre a região do Supabase**: ao criar o projecto, escolher a região **EU (Frankfurt)** ou outra na Europa. Isto é relevante para conformidade RGPD pois garante que os dados pessoais ficam armazenados na UE.

---

## Design / UI

- **Tema**: claro, limpo, profissional. Usar shadcn/ui com tema default (pode ser customizado depois).
- **Cores das etapas do pipeline**:
  - Novo: `slate` (cinza)
  - A Contactar: `blue`
  - Contactado: `cyan`
  - Reunião Marcada: `amber`
  - Proposta Enviada: `purple`
  - Ganho: `green`
  - Perdido: `red`
- **Cores dos serviços (badges)**:
  - Website: `blue`
  - Website + Reservas: `teal`
  - Loja Online: `orange`
  - SEO: `violet`
  - Múltiplos: `slate`
- **Responsivo**: desktop-first mas funcional em mobile (a utilizadora de vendas pode precisar de consultar em telemóvel).
- **Sidebar** de navegação com: Dashboard, Pipeline, Leads, Tarefas, (futuro: Relatórios, Configurações).

---

## Estrutura de Ficheiros (Next.js App Router)

```
/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Layout raiz com sidebar
│   │   ├── login/
│   │   │   └── page.tsx            # Página de login
│   │   ├── dashboard/
│   │   │   └── page.tsx            # Dashboard principal
│   │   ├── pipeline/
│   │   │   └── page.tsx            # Vista Kanban
│   │   ├── leads/
│   │   │   ├── page.tsx            # Lista de leads (tabela)
│   │   │   └── [id]/
│   │   │       └── page.tsx        # Detalhe do lead
│   │   ├── tarefas/
│   │   │   └── page.tsx            # Vista de tarefas
│   ├── components/
│   │   ├── ui/                     # shadcn/ui components
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   ├── header.tsx
│   │   │   └── auth-guard.tsx      # Protecção de rotas
│   │   ├── leads/
│   │   │   ├── lead-card.tsx       # Card no kanban
│   │   │   ├── lead-form.tsx       # Modal criar/editar lead
│   │   │   ├── lead-table.tsx      # Tabela de leads
│   │   │   └── lead-filters.tsx    # Filtros
│   │   ├── pipeline/
│   │   │   ├── kanban-board.tsx    # Board completo
│   │   │   └── kanban-column.tsx   # Coluna individual
│   │   ├── atividades/
│   │   │   ├── timeline.tsx        # Timeline de actividades
│   │   │   └── activity-form.tsx   # Registar actividade rápida
│   │   ├── tarefas/
│   │   │   ├── task-list.tsx       # Lista de tarefas
│   │   │   ├── task-form.tsx       # Criar tarefa
│   │   │   └── task-item.tsx       # Tarefa individual
│   │   └── dashboard/
│   │       ├── stats-cards.tsx     # Cartões de resumo
│   │       └── recent-activity.tsx # Actividade recente
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts           # Browser client
│   │   │   └── server.ts           # Server client
│   ├── middleware.ts                # Auth middleware (Next.js requer na raiz do src)
│   │   ├── types.ts                # TypeScript types (Lead, Tarefa, etc.)
│   │   ├── constants.ts            # Enums, labels, cores
│   │   └── utils.ts                # Helpers (formatar telefone, etc.)
│   └── hooks/
│       ├── use-leads.ts            # Hook para CRUD leads
│       ├── use-tarefas.ts          # Hook para CRUD tarefas
│       └── use-atividades.ts       # Hook para actividades
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # Todo o SQL acima
├── .env.local                      # NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
├── package.json
└── README.md
```

---

## Constantes e Labels (PT)

```typescript
// src/lib/constants.ts

export const ETAPAS = {
  novo: { label: 'Novo', cor: 'slate', ordem: 1 },
  a_contactar: { label: 'A Contactar', cor: 'blue', ordem: 2 },
  contactado: { label: 'Contactado', cor: 'cyan', ordem: 3 },
  reuniao_marcada: { label: 'Reunião Marcada', cor: 'amber', ordem: 4 },
  proposta_enviada: { label: 'Proposta Enviada', cor: 'purple', ordem: 5 },
  ganho: { label: 'Ganho', cor: 'green', ordem: 6 },
  perdido: { label: 'Perdido', cor: 'red', ordem: 7 },
} as const;

export const ORIGENS = {
  formulario_site: { label: 'Formulário do Site', icone: 'globe' },
  whatsapp: { label: 'WhatsApp', icone: 'message-circle' },
  chamada: { label: 'Chamada', icone: 'phone' },
  google_ads: { label: 'Google Ads', icone: 'target' },
  facebook_ads: { label: 'Facebook Ads', icone: 'facebook' },
  email: { label: 'Email', icone: 'mail' },
  referencia: { label: 'Referência', icone: 'users' },
  organico: { label: 'Orgânico', icone: 'search' },
  outro: { label: 'Outro', icone: 'more-horizontal' },
} as const;

export const SERVICOS = {
  website: { label: 'Website', cor: 'blue' },
  website_reservas: { label: 'Website + Reservas', cor: 'teal' },
  loja_online: { label: 'Loja Online', cor: 'orange' },
  seo: { label: 'SEO', cor: 'violet' },
  multiplos: { label: 'Múltiplos', cor: 'slate' },
} as const;

export const TIPOS_ATIVIDADE = {
  chamada: { label: 'Chamada', icone: 'phone' },
  whatsapp: { label: 'WhatsApp', icone: 'message-circle' },
  email: { label: 'Email', icone: 'mail' },
  reuniao: { label: 'Reunião', icone: 'video' },
  nota: { label: 'Nota', icone: 'file-text' },
  formulario: { label: 'Formulário', icone: 'globe' },
  outro: { label: 'Outro', icone: 'more-horizontal' },
} as const;

export const PRIORIDADES = {
  baixa: { label: 'Baixa', cor: 'slate' },
  media: { label: 'Média', cor: 'amber' },
  alta: { label: 'Alta', cor: 'red' },
} as const;
```

---

## Setup Inicial (para executar uma vez)

### 1. Supabase
1. Criar projecto em supabase.com (free tier)
2. Ir a SQL Editor → executar o migration `001_initial_schema.sql`
3. Em Authentication > Settings: desactivar sign-up público (confirmations off)
4. Criar os 2 utilizadores manualmente via Authentication > Users > Add User
5. Inserir os 2 profiles manualmente via SQL:
```sql
INSERT INTO public.profiles (id, nome, papel, email) VALUES
  ('<uuid-user-1>', 'Teu Nome', 'admin', 'teu@email.com'),
  ('<uuid-user-2>', 'Nome da Esposa', 'vendas', 'esposa@email.com');
```
6. Copiar URL e anon key de Settings > API

### 2. Next.js
1. `npx create-next-app@latest crm --typescript --tailwind --app --src-dir`
2. `npx shadcn@latest init`
3. Instalar dependências: `npm install @supabase/supabase-js @supabase/ssr @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`
4. Adicionar componentes shadcn necessários: `npx shadcn@latest add button card input label select badge dialog sheet table tabs dropdown-menu avatar tooltip`
5. Configurar `.env.local` com as keys do Supabase

### 3. Vercel
1. Push do repo para GitHub
2. Importar projecto no Vercel
3. Adicionar variáveis de ambiente (Supabase URL + anon key)
4. Deploy automático

---

## Prioridade de Implementação

### Fase 1 — MVP funcional (objectivo: usar no dia-a-dia)
1. ✅ Schema da base de dados + triggers
2. ✅ Auth + login
3. ✅ Página de leads (tabela com filtros + criação)
4. ✅ Pipeline kanban (drag & drop)
5. ✅ Detalhe do lead (info + timeline + tarefas)
6. ✅ Vista de tarefas (hoje / atrasadas)
7. ✅ Dashboard com resumo

### Fase 2 — Valor acrescentado
8. API para integração com formulário do site (webhook)
9. Notificações por email (Resend + cron/edge function)
10. Notificações WhatsApp (WhatsApp Business API)
11. Relatórios básicos (leads por origem, taxa de conversão, tempo médio por etapa)
12. Importação em massa de leads (CSV)
13. Exportação para CSV

### Fase 3 — Escala
14. Dashboard analítico com gráficos
15. Histórico de propostas/valores
16. Integração com Google Calendar
17. Templates de email/WhatsApp
18. Log de alterações (audit trail)

---

## Plano de Implementação Detalhado (Fase 1 — MVP)

O plano segue a ordem de dependências: primeiro a fundação (projecto + DB + auth), depois as páginas por ordem de complexidade crescente. Cada passo produz algo testável.

---

### Passo 0 — Setup do projecto e infraestrutura

**Objectivo**: Ter o projecto Next.js a correr localmente com Supabase conectado.

**Tarefas:**
1. Criar projecto Supabase (região EU — Frankfurt) e guardar URL + anon key
2. Criar projecto Next.js:
   ```bash
   npx create-next-app@latest crm --typescript --tailwind --app --src-dir
   ```
3. Inicializar shadcn/ui:
   ```bash
   npx shadcn@latest init
   ```
4. Instalar dependências:
   ```bash
   npm install @supabase/supabase-js @supabase/ssr @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities resend
   ```
5. Adicionar componentes shadcn:
   ```bash
   npx shadcn@latest add button card input label select badge dialog sheet table tabs dropdown-menu avatar tooltip checkbox textarea popover calendar command separator scroll-area alert sonner
   ```
6. Configurar `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
   ```
7. Configurar `next.config.js` com security headers (definidos na secção de segurança)
8. Criar `src/lib/supabase/client.ts` (browser client com `createBrowserClient`)
9. Criar `src/lib/supabase/server.ts` (server client com `createServerClient`)
10. Criar `src/middleware.ts` (refresh de sessão em cada request)

**Resultado testável**: App Next.js arranca localmente, ligação ao Supabase funciona.

---

### Passo 1 — Base de dados

**Objectivo**: Schema completo no Supabase, pronto para receber dados.

**Tarefas:**
1. Criar ficheiro `supabase/migrations/001_initial_schema.sql` com todo o SQL do blueprint:
   - ENUMs (`etapa_lead`, `origem_lead`, `servico_lead`, `tipo_atividade`)
   - Tabelas (`profiles`, `leads`, `atividades`, `tarefas`)
   - Índices
   - RLS policies
   - Trigger `update_updated_at`
   - Trigger `trigger_novo_lead` (auto-tarefa)
   - Trigger `trigger_mudanca_etapa` (auto-tarefas + actividade)
   - Trigger `trigger_qualificar_lead` (auto-tags)
   - Views (`leads_sem_proxima_acao`, `leads_atrasados`, `stats_pipeline`, `tarefas_hoje`, `leads_para_anonimizar`)
   - Função `anonimizar_lead()`
2. Executar o migration no SQL Editor do Supabase
3. Desactivar sign-up público em Authentication > Settings
4. Criar os 2 utilizadores via Authentication > Users > Add User
5. Inserir os 2 profiles via SQL (com UUIDs reais)
6. Testar RLS: confirmar que queries autenticadas funcionam

**Resultado testável**: Tabelas visíveis no Supabase, inserção/leitura de leads funciona via SQL Editor.

---

### Passo 2 — Tipos, constantes e utilitários

**Objectivo**: Camada de tipos e helpers partilhados.

**Ficheiros a criar:**
1. `src/lib/types.ts` — interfaces TypeScript para `Lead`, `Tarefa`, `Atividade`, `Profile` (espelho do schema)
2. `src/lib/constants.ts` — `ETAPAS`, `ORIGENS`, `SERVICOS`, `TIPOS_ATIVIDADE`, `PRIORIDADES` (conforme definido no blueprint)
3. `src/lib/utils.ts` — helpers:
   - `formatarTelefone(tel: string)` → formato display
   - `limparTelefone(tel: string)` → só dígitos para wa.me link
   - `formatarData(date: string)` → PT-PT locale
   - `formatarMoeda(valor: number)` → EUR
   - `cn()` (já vem do shadcn)
   - `isAtrasado(date: string)` → boolean
   - `getIniciais(nome: string)` → "AB"

**Resultado testável**: Imports funcionam, sem erros de TypeScript.

---

### Passo 3 — Autenticação e layout

**Objectivo**: Login funcional + layout com sidebar + protecção de rotas.

**Ficheiros a criar:**
1. `src/app/login/page.tsx` — formulário email + password, `signInWithPassword`, redirect para `/dashboard`
2. `src/components/layout/auth-guard.tsx` — wrapper que verifica sessão, redirige para `/login` se não autenticado
3. `src/components/layout/sidebar.tsx` — navegação lateral: Dashboard, Pipeline, Leads, Tarefas. Mostra nome + avatar do utilizador. Botão de logout.
4. `src/components/layout/header.tsx` — barra superior com título da página + breadcrumbs
5. `src/app/layout.tsx` — layout raiz com `AuthGuard` + `Sidebar` (excepto `/login`)
6. `src/app/dashboard/page.tsx` — placeholder "Dashboard" (implementação real no Passo 8)

**Resultado testável**: Login funciona, redirect para dashboard, sidebar navega entre páginas, logout funciona, rotas protegidas.

---

### Passo 4 — Hooks de dados (CRUD)

**Objectivo**: Camada de acesso a dados reutilizável.

**Ficheiros a criar:**
1. `src/hooks/use-leads.ts`:
   - `fetchLeads(filtros?)` — lista com filtros opcionais (etapa, origem, servico, owner, estado, search, tags)
   - `fetchLead(id)` — lead individual com actividades e tarefas
   - `createLead(data)` — inserir novo lead
   - `updateLead(id, data)` — actualizar campos
   - `archiveLead(id)` — mudar estado para arquivado
   - `exportLeadData(id)` — exportar JSON (RGPD)
2. `src/hooks/use-tarefas.ts`:
   - `fetchTarefas(filtros?)` — lista com filtros (assigned_to, status, periodo)
   - `createTarefa(data)` — nova tarefa
   - `completarTarefa(id)` — marcar como concluída + completed_at
   - `cancelarTarefa(id)` — marcar como cancelada
3. `src/hooks/use-atividades.ts`:
   - `fetchAtividades(lead_id)` — timeline de um lead
   - `createAtividade(data)` — registar actividade

**Nota**: Usar `@supabase/ssr` para client-side queries. Considerar React Query (`@tanstack/react-query`) para cache e revalidação — se optarmos por isto, adicionar como dependência.

**Resultado testável**: Hooks retornam dados do Supabase, CRUD funciona via consola/testes manuais.

---

### Passo 5 — Lista de leads (`/leads`)

**Objectivo**: Primeira página funcional com dados reais — tabela de leads com filtros.

**Ficheiros a criar:**
1. `src/app/leads/page.tsx` — página com tabela + filtros + botão "Novo Lead"
2. `src/components/leads/lead-table.tsx` — tabela shadcn com colunas: Nome, Empresa, Serviço, Etapa, Origem, Owner, Próxima acção, Valor, Criado em. Ordenação por qualquer coluna.
3. `src/components/leads/lead-filters.tsx` — barra de filtros: search (nome/empresa/email/telefone), etapa, origem, serviço, owner, estado, tags. Filtros combinados.
4. `src/components/leads/lead-form.tsx` — modal/sheet para criar novo lead. Campos: nome*, empresa, email, telefone, origem*, cidade, serviço, valor_estimado, owner_id, notas. (* = obrigatório)

**Resultado testável**: Tabela mostra leads, filtros funcionam, criar novo lead funciona, lead aparece na tabela.

---

### Passo 6 — Pipeline Kanban (`/pipeline`)

**Objectivo**: Vista kanban com drag & drop funcional.

**Ficheiros a criar:**
1. `src/app/pipeline/page.tsx` — página com board + filtros no topo
2. `src/components/pipeline/kanban-board.tsx` — board completo com DndContext (@dnd-kit). 7 colunas. Filtra leads com estado = 'ativo'. Ao dropar card noutra coluna → `updateLead(id, { etapa })`.
3. `src/components/pipeline/kanban-column.tsx` — coluna individual com header (nome + contagem + valor total). Droppable area.
4. `src/components/leads/lead-card.tsx` — card individual: nome, empresa, serviço (badge), origem (ícone), owner (avatar), próxima acção (vermelho se atrasada), valor, tag alta_intencao. Click → navega para `/leads/[id]`.
5. `src/components/leads/loss-reason-modal.tsx` — modal que abre ao mover lead para "Perdido". Campo obrigatório `motivo_perda`.

**Resultado testável**: Board renderiza leads nas colunas certas, drag & drop move leads entre etapas, modal de perda funciona, triggers do DB disparam (tarefas auto-criadas).

---

### Passo 7 — Detalhe do lead (`/leads/[id]`)

**Objectivo**: Página completa com toda a informação, timeline e tarefas de um lead.

**Ficheiros a criar:**
1. `src/app/leads/[id]/page.tsx` — layout 2 colunas (60/40)
2. **Coluna esquerda:**
   - Cabeçalho: nome, empresa, etapa (dropdown), owner (dropdown)
   - Campos editáveis inline (email, telefone, cidade, origem, serviço, valor, notas)
   - Botões de acção rápida: "Abrir WhatsApp", "Enviar Email", "Nova Tarefa", "Registar Actividade"
   - `src/components/atividades/timeline.tsx` — lista cronológica de actividades (ícone + descrição + autor + data)
   - `src/components/atividades/activity-form.tsx` — formulário rápido inline (tipo + descrição)
3. **Coluna direita:**
   - `src/components/tarefas/task-list.tsx` — tarefas do lead (pendentes primeiro)
   - `src/components/tarefas/task-item.tsx` — tarefa individual com checkbox, título, data, assignee, prioridade
   - `src/components/tarefas/task-form.tsx` — modal para criar tarefa (título, descrição, due_at, assigned_to, prioridade)
   - Tags editáveis
   - Datas (criado, actualizado)
   - Se `etapa = 'perdido'`: mostrar motivo_perda
   - Se `dados_anonimizados = true`: aviso visual + impedir edição
4. **Acções RGPD (só admin):**
   - Botão "Exportar dados pessoais" → gera JSON
   - Botão "Anonimizar dados" → confirmação dupla → chama `anonimizar_lead()`

**Resultado testável**: Detalhe do lead mostra toda a info, campos editáveis guardam, timeline mostra actividades, tarefas listam e completam, botões de acção rápida funcionam.

---

### Passo 8 — Vista de tarefas (`/tarefas`)

**Objectivo**: Página focada nas tarefas do dia-a-dia.

**Ficheiros a criar:**
1. `src/app/tarefas/page.tsx` — página com tabs: Hoje, Esta Semana, Atrasadas, Todas
2. Reutilizar `task-list.tsx`, `task-item.tsx`, `task-form.tsx` do Passo 7
3. Ao concluir tarefa → mostrar prompt "Qual é a próxima acção?" com opção de criar nova tarefa imediatamente
4. Filtros: por assignee, prioridade, status

**Resultado testável**: Tabs mostram tarefas correctas, concluir tarefa funciona, prompt de próxima acção aparece.

---

### Passo 9 — Dashboard (`/dashboard`)

**Objectivo**: Visão geral do dia com alertas e resumo.

**Ficheiros a criar:**
1. `src/app/dashboard/page.tsx` — substituir placeholder
2. `src/components/dashboard/stats-cards.tsx` — 5 cartões:
   - Total leads activos
   - Leads sem próxima acção (vermelho se > 0, usa view `leads_sem_proxima_acao`)
   - Leads com follow-up atrasado (vermelho se > 0, usa view `leads_atrasados`)
   - Tarefas pendentes hoje (usa view `tarefas_hoje`)
   - Valor total no pipeline (usa view `stats_pipeline`)
3. `src/components/dashboard/recent-activity.tsx` — últimas 10 actividades globais
4. Lista "As minhas tarefas de hoje" (reutiliza componentes de tarefas)
5. Lista "Leads que precisam de atenção" (combina sem próxima acção + atrasados, limite 10)

**Resultado testável**: Dashboard mostra métricas correctas, alertas visuais funcionam, links navegam para os leads/tarefas.

---

### Passo 10 — Polimento e testes finais

**Objectivo**: App pronta para uso diário.

**Tarefas:**
1. **Responsividade**: testar em mobile, garantir que sidebar colapsa e tabelas fazem scroll horizontal
2. **Loading states**: skeletons/spinners em todas as páginas enquanto carrega dados
3. **Error handling**: toast notifications (sonner) para erros e confirmações
4. **Empty states**: mensagens amigáveis quando não há leads/tarefas/actividades
5. **Validação de formulários**: campos obrigatórios, formato de email/telefone
6. **Logout por inactividade**: timer de 30 minutos sem interacção → logout automático
7. **Performance**: garantir que queries usam os índices definidos, sem N+1
8. **Testes manuais E2E**: percorrer todos os fluxos (criar lead → contactar → reunião → proposta → ganho/perdido)
9. **Deploy no Vercel**: push para GitHub, importar no Vercel, configurar env vars

---

### Estimativa de Complexidade por Passo

| Passo | Descrição | Complexidade | Dependências |
|-------|-----------|-------------|--------------|
| 0 | Setup projecto | Baixa | Nenhuma |
| 1 | Base de dados | Baixa | Passo 0 (Supabase criado) |
| 2 | Tipos e constantes | Baixa | Passo 0 |
| 3 | Auth + layout | Média | Passos 0, 1 |
| 4 | Hooks de dados | Média | Passos 1, 2 |
| 5 | Lista de leads | Média-Alta | Passos 2, 3, 4 |
| 6 | Pipeline kanban | Alta | Passos 2, 3, 4 |
| 7 | Detalhe do lead | Alta | Passos 4, 5 |
| 8 | Vista de tarefas | Média | Passo 4 |
| 9 | Dashboard | Média | Passos 4, 5 |
| 10 | Polimento | Média | Todos |

---

### Notas de Implementação

- **React Query**: Recomendo adicionar `@tanstack/react-query` nos hooks (Passo 4) para cache, revalidação automática e optimistic updates — especialmente útil no kanban drag & drop.
- **Ordem de triggers**: `trigger_qualificar_lead` e `trigger_novo_lead` ambos são BEFORE INSERT. O PostgreSQL executa-os por ordem alfabética de nome. Como `auto_qualificar_lead` < `auto_tarefa_novo_lead` alfabeticamente, as tags são adicionadas antes da tarefa ser criada — está correcto.
- **Realtime**: Considerar activar Supabase Realtime nas tabelas `leads` e `tarefas` para que ambos os utilizadores vejam alterações em tempo real sem refresh manual. Isto é simples de adicionar nos hooks.
- **Exportação CSV**: Marcada como Fase 2 no blueprint, mas pode ser adicionada facilmente na lista de leads (Passo 5) como bónus se houver tempo.
