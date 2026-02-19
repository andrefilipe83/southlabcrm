'use client'

import { createClient } from '@/lib/supabase/client'
import type { Atividade, AtividadeFormData } from '@/lib/types'

function getSupabase() {
  return createClient()
}

export async function fetchAtividades(leadId: string): Promise<Atividade[]> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('atividades')
    .select('*, autor:profiles(*)')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as Atividade[]
}

export async function createAtividade(dados: AtividadeFormData): Promise<Atividade> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('atividades')
    .insert(dados)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Atividade
}

export async function fetchAtividadesRecentes(limite = 10): Promise<Atividade[]> {
  const supabase = getSupabase()

  const { data, error } = await supabase
    .from('atividades')
    .select('*, autor:profiles(*), lead:leads(id, nome, empresa)')
    .order('created_at', { ascending: false })
    .limit(limite)

  if (error) throw new Error(error.message)
  return (data ?? []) as Atividade[]
}
