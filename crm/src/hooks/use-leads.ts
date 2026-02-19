'use client'

import { createClient } from '@/lib/supabase/client'
import type { Lead, LeadFiltros, LeadFormData, Profile } from '@/lib/types'

function getSupabase() {
  return createClient()
}

export async function fetchLeads(filtros: LeadFiltros = {}): Promise<Lead[]> {
  const supabase = getSupabase()

  let query = supabase
    .from('leads')
    .select('*, owner:profiles(*)')
    .order('created_at', { ascending: false })

  // Estado (default: só activos)
  if (filtros.estado) {
    query = query.eq('estado', filtros.estado)
  } else {
    query = query.eq('estado', 'ativo')
  }

  if (filtros.etapa) query = query.eq('etapa', filtros.etapa)
  if (filtros.origem) query = query.eq('origem', filtros.origem)
  if (filtros.servico) query = query.eq('servico', filtros.servico)
  if (filtros.owner_id) query = query.eq('owner_id', filtros.owner_id)

  if (filtros.search) {
    query = query.or(
      `nome.ilike.%${filtros.search}%,empresa.ilike.%${filtros.search}%,email.ilike.%${filtros.search}%,telefone.ilike.%${filtros.search}%`
    )
  }

  if (filtros.tags && filtros.tags.length > 0) {
    query = query.overlaps('tags', filtros.tags)
  }

  if (filtros.de) query = query.gte('created_at', filtros.de)
  if (filtros.ate) query = query.lte('created_at', filtros.ate)

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return (data ?? []) as Lead[]
}

export async function fetchLead(id: string): Promise<Lead & { owner: Profile | null }> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('leads')
    .select('*, owner:profiles(*)')
    .eq('id', id)
    .single()

  if (error) throw new Error(error.message)
  return data as Lead & { owner: Profile | null }
}

export async function createLead(dados: LeadFormData): Promise<Lead> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('leads')
    .insert(dados)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Lead
}

export async function updateLead(id: string, dados: Partial<LeadFormData>): Promise<Lead> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('leads')
    .update(dados)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Lead
}

export async function archiveLead(id: string): Promise<void> {
  const supabase = getSupabase()

  const { error } = await supabase
    .from('leads')
    .update({ estado: 'arquivado' })
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function anonimizarLead(id: string): Promise<void> {
  const supabase = getSupabase()

  const { error } = await supabase.rpc('anonimizar_lead', { lead_uuid: id })

  if (error) throw new Error(error.message)
}

export async function exportLeadData(id: string): Promise<object> {
  const supabase = getSupabase()

  const [leadResult, atividadesResult, tarefasResult] = await Promise.all([
    supabase.from('leads').select('*').eq('id', id).single(),
    supabase.from('atividades').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
    supabase.from('tarefas').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
  ])

  if (leadResult.error) throw new Error(leadResult.error.message)

  return {
    lead: leadResult.data,
    atividades: atividadesResult.data ?? [],
    tarefas: tarefasResult.data ?? [],
    exportado_em: new Date().toISOString(),
  }
}

export async function fetchProfiles(): Promise<Profile[]> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('nome')

  if (error) throw new Error(error.message)
  return (data ?? []) as Profile[]
}
