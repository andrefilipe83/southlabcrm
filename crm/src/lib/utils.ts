import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================================
// Formatação de datas
// ============================================================

export function formatarData(date: string | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatarDataHora(date: string | null | undefined): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatarDataRelativa(date: string | null | undefined): string {
  if (!date) return '—'
  const d = new Date(date)
  const agora = new Date()
  const diffMs = agora.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMin / 60)
  const diffDias = Math.floor(diffH / 24)

  if (diffMin < 1) return 'agora mesmo'
  if (diffMin < 60) return `há ${diffMin} min`
  if (diffH < 24) return `há ${diffH}h`
  if (diffDias === 1) return 'ontem'
  if (diffDias < 7) return `há ${diffDias} dias`
  return formatarData(date)
}

// ============================================================
// Formatação de moeda
// ============================================================

export function formatarMoeda(valor: number | null | undefined): string {
  if (valor == null) return '—'
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor)
}

// ============================================================
// Telefone / WhatsApp
// ============================================================

export function limparTelefone(tel: string | null | undefined): string {
  if (!tel) return ''
  // Remove tudo exceto dígitos e +
  return tel.replace(/[^\d+]/g, '')
}

export function formatarTelefone(tel: string | null | undefined): string {
  if (!tel) return '—'
  const limpo = limparTelefone(tel)
  // Formato PT: +351 XXX XXX XXX
  if (limpo.startsWith('+351') && limpo.length === 13) {
    return `+351 ${limpo.slice(4, 7)} ${limpo.slice(7, 10)} ${limpo.slice(10)}`
  }
  return tel
}

export function urlWhatsApp(tel: string, nome: string): string {
  const numero = limparTelefone(tel)
  const mensagem = encodeURIComponent(`Olá ${nome}, `)
  return `https://wa.me/${numero}?text=${mensagem}`
}

// ============================================================
// Avatar / iniciais
// ============================================================

export function getIniciais(nome: string | null | undefined): string {
  if (!nome) return '?'
  const partes = nome.trim().split(' ')
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

// ============================================================
// Verificações de estado
// ============================================================

export function isAtrasado(date: string | null | undefined): boolean {
  if (!date) return false
  return new Date(date) < new Date()
}

export function isHoje(date: string | null | undefined): boolean {
  if (!date) return false
  const d = new Date(date)
  const hoje = new Date()
  return (
    d.getFullYear() === hoje.getFullYear() &&
    d.getMonth() === hoje.getMonth() &&
    d.getDate() === hoje.getDate()
  )
}

// ============================================================
// Pluralização simples PT
// ============================================================

export function pluralizar(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`
}
