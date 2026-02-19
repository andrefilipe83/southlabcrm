'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { TaskItem } from '@/components/tarefas/task-item'
import { createClient } from '@/lib/supabase/client'
import { fetchAtividadesRecentes } from '@/hooks/use-atividades'
import { fetchTarefas, completarTarefa } from '@/hooks/use-tarefas'
import type { Atividade, Tarefa, StatsPipeline } from '@/lib/types'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalLeads: 0,
    semProximaAcao: 0,
    atrasados: 0,
    tarefasHoje: 0,
    valorPipeline: 0,
  })
  const [tarefasHoje, setTarefasHoje] = useState<Tarefa[]>([])
  const [leadsAtencao, setLeadsAtencao] = useState<
    { id: string; nome: string; empresa: string | null; motivo: string }[]
  >([])
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [aCarregar, setACarregar] = useState(true)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setACarregar(true)
    const supabase = createClient()

    try {
      const [
        pipelineResult,
        semAcaoResult,
        atrasadosResult,
        atividadesData,
        tarefasData,
      ] = await Promise.all([
        supabase.from('stats_pipeline').select('*'),
        supabase.from('leads_sem_proxima_acao').select('id, nome, empresa').limit(10),
        supabase.from('leads_atrasados').select('id, nome, empresa').limit(10),
        fetchAtividadesRecentes(10),
        fetchTarefas({ periodo: 'hoje' }),
      ])

      const pipeline = (pipelineResult.data ?? []) as StatsPipeline[]
      const totalLeads = pipeline.reduce((s, r) => s + Number(r.total), 0)
      const valorPipeline = pipeline
        .filter((r) => r.etapa !== 'perdido')
        .reduce((s, r) => s + Number(r.valor_total), 0)

      const semAcao = (semAcaoResult.data ?? []) as { id: string; nome: string; empresa: string | null }[]
      const atrasados = (atrasadosResult.data ?? []) as { id: string; nome: string; empresa: string | null }[]

      const mapaAtencao = new Map<string, { id: string; nome: string; empresa: string | null; motivo: string }>()
      atrasados.forEach((l) => mapaAtencao.set(l.id, { ...l, motivo: 'Follow-up atrasado' }))
      semAcao.forEach((l) => {
        if (!mapaAtencao.has(l.id)) mapaAtencao.set(l.id, { ...l, motivo: 'Sem próxima acção' })
      })

      setStats({
        totalLeads,
        semProximaAcao: semAcao.length,
        atrasados: atrasados.length,
        tarefasHoje: tarefasData.length,
        valorPipeline,
      })
      setTarefasHoje(tarefasData)
      setLeadsAtencao(Array.from(mapaAtencao.values()).slice(0, 10))
      setAtividades(atividadesData)
    } catch {
      toast.error('Erro ao carregar dashboard')
    } finally {
      setACarregar(false)
    }
  }

  async function handleCompletar(id: string) {
    try {
      await completarTarefa(id)
      setTarefasHoje((prev) => prev.filter((t) => t.id !== id))
      setStats((prev) => ({ ...prev, tarefasHoje: Math.max(0, prev.tarefasHoje - 1) }))
      toast.success('Tarefa concluída')
    } catch {
      toast.error('Erro ao completar tarefa')
    }
  }

  if (aCarregar) {
    return <div className="py-16 text-center text-muted-foreground">A carregar dashboard...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {new Date().toLocaleDateString('pt-PT', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          })}
        </p>
      </div>

      <StatsCards {...stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tarefas de hoje */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Tarefas de hoje</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/tarefas" className="gap-1">
                  Ver todas <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {tarefasHoje.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Sem tarefas para hoje. Excelente!
              </p>
            ) : (
              <div className="space-y-2">
                {tarefasHoje.slice(0, 8).map((t) => (
                  <TaskItem key={t.id} tarefa={t} onCompletar={handleCompletar} mostrarLead />
                ))}
                {tarefasHoje.length > 8 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    +{tarefasHoje.length - 8} mais —{' '}
                    <Link href="/tarefas" className="underline">ver todas</Link>
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leads que precisam de atenção */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Leads que precisam de atenção</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/leads" className="gap-1">
                  Ver leads <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {leadsAtencao.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Todos os leads têm follow-up definido!
              </p>
            ) : (
              <div className="divide-y">
                {leadsAtencao.map((l) => (
                  <div key={l.id} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0">
                      <Link href={`/leads/${l.id}`} className="text-sm font-medium hover:underline">
                        {l.nome}
                      </Link>
                      {l.empresa && <p className="text-xs text-muted-foreground">{l.empresa}</p>}
                    </div>
                    <span className="text-xs text-red-600 font-medium shrink-0 ml-3">
                      {l.motivo}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actividade recente */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Actividade recente</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentActivity
              atividades={
                atividades as (Atividade & {
                  lead?: { id: string; nome: string; empresa?: string }
                })[]
              }
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
