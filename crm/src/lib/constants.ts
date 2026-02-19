import type { EtapaLead, OrigemLead, ServicoLead, TipoAtividade, PrioridadeTarefa } from './types'

// ============================================================
// Etapas do pipeline
// ============================================================

export const ETAPAS: Record<EtapaLead, { label: string; cor: string; ordem: number }> = {
  novo: { label: 'Novo', cor: 'slate', ordem: 1 },
  a_contactar: { label: 'A Contactar', cor: 'blue', ordem: 2 },
  contactado: { label: 'Contactado', cor: 'cyan', ordem: 3 },
  reuniao_marcada: { label: 'Reunião Marcada', cor: 'amber', ordem: 4 },
  proposta_enviada: { label: 'Proposta Enviada', cor: 'purple', ordem: 5 },
  ganho: { label: 'Ganho', cor: 'green', ordem: 6 },
  perdido: { label: 'Perdido', cor: 'red', ordem: 7 },
}

export const ETAPAS_ORDENADAS = Object.entries(ETAPAS)
  .sort(([, a], [, b]) => a.ordem - b.ordem)
  .map(([key]) => key as EtapaLead)

// ============================================================
// Origens dos leads
// ============================================================

export const ORIGENS: Record<OrigemLead, { label: string; icone: string }> = {
  formulario_site: { label: 'Formulário do Site', icone: 'globe' },
  whatsapp: { label: 'WhatsApp', icone: 'message-circle' },
  chamada: { label: 'Chamada', icone: 'phone' },
  google_ads: { label: 'Google Ads', icone: 'target' },
  facebook_ads: { label: 'Facebook Ads', icone: 'facebook' },
  email: { label: 'Email', icone: 'mail' },
  referencia: { label: 'Referência', icone: 'users' },
  organico: { label: 'Orgânico', icone: 'search' },
  outro: { label: 'Outro', icone: 'more-horizontal' },
}

// ============================================================
// Serviços
// ============================================================

export const SERVICOS: Record<ServicoLead, { label: string; cor: string }> = {
  website: { label: 'Website', cor: 'blue' },
  website_reservas: { label: 'Website + Reservas', cor: 'teal' },
  loja_online: { label: 'Loja Online', cor: 'orange' },
  seo: { label: 'SEO', cor: 'violet' },
  multiplos: { label: 'Múltiplos', cor: 'slate' },
  nao_sabe: { label: 'Não sabe', cor: 'gray' },
}

// ============================================================
// Tipos de actividade
// ============================================================

export const TIPOS_ATIVIDADE: Record<TipoAtividade, { label: string; icone: string }> = {
  chamada: { label: 'Chamada', icone: 'phone' },
  whatsapp: { label: 'WhatsApp', icone: 'message-circle' },
  email: { label: 'Email', icone: 'mail' },
  reuniao: { label: 'Reunião', icone: 'video' },
  nota: { label: 'Nota', icone: 'file-text' },
  formulario: { label: 'Formulário', icone: 'globe' },
  outro: { label: 'Outro', icone: 'more-horizontal' },
}

// ============================================================
// Prioridades de tarefas
// ============================================================

export const PRIORIDADES: Record<PrioridadeTarefa, { label: string; cor: string }> = {
  baixa: { label: 'Baixa', cor: 'slate' },
  media: { label: 'Média', cor: 'amber' },
  alta: { label: 'Alta', cor: 'red' },
}

// ============================================================
// Cores das etapas → classes Tailwind (badges)
// ============================================================

export const ETAPA_BADGE_CLASSES: Record<EtapaLead, string> = {
  novo: 'bg-slate-100 text-slate-700 border-slate-200',
  a_contactar: 'bg-blue-100 text-blue-700 border-blue-200',
  contactado: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  reuniao_marcada: 'bg-amber-100 text-amber-700 border-amber-200',
  proposta_enviada: 'bg-purple-100 text-purple-700 border-purple-200',
  ganho: 'bg-green-100 text-green-700 border-green-200',
  perdido: 'bg-red-100 text-red-700 border-red-200',
}

export const SERVICO_BADGE_CLASSES: Record<ServicoLead, string> = {
  website: 'bg-blue-100 text-blue-700 border-blue-200',
  website_reservas: 'bg-teal-100 text-teal-700 border-teal-200',
  loja_online: 'bg-orange-100 text-orange-700 border-orange-200',
  seo: 'bg-violet-100 text-violet-700 border-violet-200',
  multiplos: 'bg-slate-100 text-slate-700 border-slate-200',
  nao_sabe: 'bg-gray-100 text-gray-600 border-gray-200',
}

export const PRIORIDADE_BADGE_CLASSES: Record<PrioridadeTarefa, string> = {
  baixa: 'bg-slate-100 text-slate-700 border-slate-200',
  media: 'bg-amber-100 text-amber-700 border-amber-200',
  alta: 'bg-red-100 text-red-700 border-red-200',
}

// ============================================================
// Navegação da sidebar
// ============================================================

export const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
  { href: '/pipeline', label: 'Pipeline', icon: 'kanban' },
  { href: '/leads', label: 'Leads', icon: 'users' },
  { href: '/tarefas', label: 'Tarefas', icon: 'check-square' },
] as const
