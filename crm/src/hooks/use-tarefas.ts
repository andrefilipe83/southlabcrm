'use client'

import { createClient } from '@/lib/supabase/client'
import type { Tarefa, TarefaFiltros, TarefaFormData } from '@/lib/types'

function getSupabase() {
  return createClient()
}

export async function fetchTarefas(filtros: TarefaFiltros = {}): Promise<Tarefa[]> {
  const supabase = getSupabase()

  let query = supabase
    .from('tarefas')
    .select('*, assignee:profiles(*), lead:leads(id, nome, empresa)')
    .order('due_at', { ascending: true })

  if (filtros.assigned_to) query = query.eq('assigned_to', filtros.assigned_to)
  if (filtros.status) {
    query = query.eq('status', filtros.status)
  } else {
    // Por defeito mostrar apenas pendentes
    query = query.eq('status', 'pendente')
  }
  if (filtros.prioridade) query = query.eq('prioridade', filtros.prioridade)

  // Filtro por período
  if (filtros.periodo === 'hoje') {
    const hoje = new Date()
    hoje.setHours(23, 59, 59, 999)
    query = query.lte('due_at', hoje.toISOString())
  } else if (filtros.periodo === 'semana') {
    const fimSemana = new Date()
    fimSemana.setDate(fimSemana.getDate() + 7)
    fimSemana.setHours(23, 59, 59, 999)
    query = query.lte('due_at', fimSemana.toISOString()).gte('due_at', new Date().toISOString())
  } else if (filtros.periodo === 'atrasadas') {
    query = query.lt('due_at', new Date().toISOString())
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return (data ?? []) as Tarefa[]
}

export async function fetchTarefasLead(leadId: string): Promise<Tarefa[]> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('tarefas')
    .select('*, assignee:profiles(*)')
    .eq('lead_id', leadId)
    .order('status', { ascending: true }) // pendente primeiro
    .order('due_at', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as Tarefa[]
}

export async function createTarefa(dados: TarefaFormData): Promise<Tarefa> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('tarefas')
    .insert(dados)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Tarefa
}

export async function completarTarefa(id: string): Promise<void> {
  const supabase = getSupabase()

  const { error } = await supabase
    .from('tarefas')
    .update({ status: 'concluida', completed_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(error.message)
}

export async function cancelarTarefa(id: string): Promise<void> {
  const supabase = getSupabase()

  const { error } = await supabase
    .from('tarefas')
    .update({ status: 'cancelada' })
    .eq('id', id)

  if (error) throw new Error(error.message)
}
