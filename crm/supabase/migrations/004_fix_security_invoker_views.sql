-- ============================================================
-- Fix: adicionar security_invoker = true a todas as views
-- para que respeitem as políticas RLS das tabelas subjacentes
-- Nota: DROP + CREATE porque as colunas das tabelas mudaram
-- ============================================================

DROP VIEW IF EXISTS leads_sem_proxima_acao;
DROP VIEW IF EXISTS leads_atrasados;
DROP VIEW IF EXISTS stats_pipeline;
DROP VIEW IF EXISTS tarefas_hoje;
DROP VIEW IF EXISTS leads_para_anonimizar;

CREATE VIEW leads_sem_proxima_acao
WITH (security_invoker = true) AS
SELECT l.*, p.nome AS owner_nome
FROM leads l
LEFT JOIN profiles p ON l.owner_id = p.id
WHERE l.estado = 'ativo'
  AND l.etapa NOT IN ('ganho', 'perdido')
  AND l.proxima_acao_em IS NULL;

CREATE VIEW leads_atrasados
WITH (security_invoker = true) AS
SELECT l.*, p.nome AS owner_nome,
  NOW() - l.proxima_acao_em AS tempo_atraso
FROM leads l
LEFT JOIN profiles p ON l.owner_id = p.id
WHERE l.estado = 'ativo'
  AND l.etapa NOT IN ('ganho', 'perdido')
  AND l.proxima_acao_em < NOW();

CREATE VIEW stats_pipeline
WITH (security_invoker = true) AS
SELECT
  etapa,
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE proxima_acao_em < NOW()) AS atrasados,
  COALESCE(SUM(valor_estimado), 0) AS valor_total
FROM leads
WHERE estado = 'ativo'
GROUP BY etapa;

CREATE VIEW tarefas_hoje
WITH (security_invoker = true) AS
SELECT t.*, l.nome AS lead_nome, l.empresa AS lead_empresa, p.nome AS assigned_nome
FROM tarefas t
JOIN leads l ON t.lead_id = l.id
LEFT JOIN profiles p ON t.assigned_to = p.id
WHERE t.status = 'pendente'
  AND t.due_at::date <= CURRENT_DATE
ORDER BY t.prioridade DESC, t.due_at ASC;

CREATE VIEW leads_para_anonimizar
WITH (security_invoker = true) AS
SELECT l.id, l.nome, l.estado, l.updated_at,
  NOW() - l.updated_at AS tempo_inativo
FROM leads l
WHERE l.estado = 'arquivado'
  AND l.dados_anonimizados = false
  AND l.updated_at < NOW() - INTERVAL '24 months';
