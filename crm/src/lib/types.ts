// ============================================================
// Tipos TypeScript — espelho do schema Supabase
// ============================================================

export type EtapaLead =
  | 'novo'
  | 'a_contactar'
  | 'contactado'
  | 'reuniao_marcada'
  | 'proposta_enviada'
  | 'ganho'
  | 'perdido'

export type OrigemLead =
  | 'formulario_site'
  | 'whatsapp'
  | 'chamada'
  | 'google_ads'
  | 'facebook_ads'
  | 'email'
  | 'referencia'
  | 'organico'
  | 'outro'

export type ServicoLead =
  | 'website'
  | 'website_reservas'
  | 'loja_online'
  | 'seo'
  | 'multiplos'
  | 'nao_sabe'

export type TipoAtividade =
  | 'chamada'
  | 'whatsapp'
  | 'email'
  | 'reuniao'
  | 'nota'
  | 'formulario'
  | 'outro'

export type PapelUtilizador = 'admin' | 'vendas'

export type StatusTarefa = 'pendente' | 'concluida' | 'cancelada'

export type PrioridadeTarefa = 'baixa' | 'media' | 'alta'

export type BaseLegal =
  | 'interesse_legitimo'
  | 'consentimento_formulario'
  | 'consentimento_outro'

// ============================================================
// Entidades
// ============================================================

export interface Profile {
  id: string
  nome: string
  papel: PapelUtilizador
  email: string
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Lead {
  id: string
  nome: string
  empresa: string | null
  email: string | null
  telefone: string | null
  origem: OrigemLead
  cidade: string | null
  servico: ServicoLead | null
  etapa: EtapaLead
  valor_estimado: number | null
  owner_id: string | null
  proxima_acao_em: string | null
  notas: string | null
  tags: string[]
  estado: 'ativo' | 'arquivado'
  motivo_perda: string | null
  link_google_maps: string | null
  link_facebook: string | null
  link_instagram: string | null
  link_outros: string | null
  base_legal: BaseLegal
  dados_anonimizados: boolean
  created_at: string
  updated_at: string
  // relações opcionais (quando incluídas no fetch)
  owner?: Profile
}

export interface LeadComOwner extends Lead {
  owner: Profile | undefined
}

export interface Atividade {
  id: string
  lead_id: string
  tipo: TipoAtividade
  descricao: string
  created_by: string | null
  created_at: string
  // relações opcionais
  autor?: Profile
}

export interface Tarefa {
  id: string
  lead_id: string
  titulo: string
  descricao: string | null
  due_at: string
  assigned_to: string
  status: StatusTarefa
  prioridade: PrioridadeTarefa
  created_at: string
  completed_at: string | null
  // relações opcionais
  assignee?: Profile
  lead?: Pick<Lead, 'id' | 'nome' | 'empresa'>
}

// ============================================================
// Tipos para formulários
// ============================================================

export type LeadFormData = {
  nome: string
  empresa?: string
  email?: string
  telefone?: string
  origem: OrigemLead
  cidade?: string
  servico?: ServicoLead
  etapa?: EtapaLead
  valor_estimado?: number
  owner_id?: string
  proxima_acao_em?: string
  notas?: string
  tags?: string[]
  link_google_maps?: string
  link_facebook?: string
  link_instagram?: string
  link_outros?: string
  base_legal?: BaseLegal
  motivo_perda?: string
}

export type TarefaFormData = {
  lead_id: string
  titulo: string
  descricao?: string
  due_at: string
  assigned_to: string
  prioridade?: PrioridadeTarefa
}

export type AtividadeFormData = {
  lead_id: string
  tipo: TipoAtividade
  descricao: string
}

// ============================================================
// Tipos para filtros
// ============================================================

export type LeadFiltros = {
  search?: string
  etapa?: EtapaLead | ''
  origem?: OrigemLead | ''
  servico?: ServicoLead | ''
  owner_id?: string | ''
  estado?: 'ativo' | 'arquivado' | ''
  tags?: string[]
  de?: string
  ate?: string
}

export type TarefaFiltros = {
  assigned_to?: string | ''
  status?: StatusTarefa | ''
  prioridade?: PrioridadeTarefa | ''
  periodo?: 'hoje' | 'semana' | 'atrasadas' | 'todas'
}

// ============================================================
// Tipos para views do Supabase
// ============================================================

export type StatsPipeline = {
  etapa: EtapaLead
  total: number
  atrasados: number
  valor_total: number
}

export type TarefaHoje = Tarefa & {
  lead_nome: string
  lead_empresa: string | null
  assigned_nome: string | null
}
