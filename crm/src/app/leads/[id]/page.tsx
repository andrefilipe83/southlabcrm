'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft, Phone, Mail, MessageCircle, Plus, Download, AlertTriangle, ExternalLink,
  CheckSquare, SquarePen, Archive
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Timeline } from '@/components/atividades/timeline'
import { ActivityForm } from '@/components/atividades/activity-form'
import { TaskItem } from '@/components/tarefas/task-item'
import { TaskForm } from '@/components/tarefas/task-form'
import { LeadForm } from '@/components/leads/lead-form'
import { LossReasonModal } from '@/components/leads/loss-reason-modal'
import { createClient } from '@/lib/supabase/client'
import { fetchLead, updateLead, archiveLead, anonimizarLead, exportLeadData, fetchProfiles } from '@/hooks/use-leads'
import { fetchAtividades } from '@/hooks/use-atividades'
import { fetchTarefasLead, completarTarefa } from '@/hooks/use-tarefas'
import { ETAPAS, ETAPA_BADGE_CLASSES, SERVICO_BADGE_CLASSES, SERVICOS, ORIGENS } from '@/lib/constants'
import { cn, formatarData, formatarMoeda, limparTelefone, urlWhatsApp } from '@/lib/utils'
import type { Lead, Atividade, Tarefa, Profile, EtapaLead } from '@/lib/types'

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [lead, setLead] = useState<Lead | null>(null)
  const [atividades, setAtividades] = useState<Atividade[]>([])
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [perfis, setPerfis] = useState<Profile[]>([])
  const [perfilActual, setPerfilActual] = useState<Profile | null>(null)
  const [aCarregar, setACarregar] = useState(true)
  const [formAberto, setFormAberto] = useState(false)
  const [taskFormAberto, setTaskFormAberto] = useState(false)
  const [lossModal, setLossModal] = useState(false)
  const [anonimizarConfirm, setAnonimizarConfirm] = useState(false)

  async function carregar() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const [l, at, tar, ps] = await Promise.all([
        fetchLead(id),
        fetchAtividades(id),
        fetchTarefasLead(id),
        fetchProfiles(),
      ])
      setLead(l as Lead)
      setAtividades(at)
      setTarefas(tar)
      setPerfis(ps)
      if (user) {
        const meuPerfil = ps.find((p) => p.id === user.id) ?? null
        setPerfilActual(meuPerfil)
      }
    } catch {
      toast.error('Erro ao carregar lead')
    } finally {
      setACarregar(false)
    }
  }

  useEffect(() => { carregar() }, [id])

  async function handleEtapaChange(novaEtapa: EtapaLead) {
    if (!lead) return
    if (novaEtapa === 'perdido') {
      setLossModal(true)
      return
    }
    try {
      const atualizado = await updateLead(lead.id, { etapa: novaEtapa })
      setLead(atualizado)
      await carregar() // reload actividades (trigger criou nova)
      toast.success('Etapa actualizada')
    } catch {
      toast.error('Erro ao actualizar etapa')
    }
  }

  async function handleLossConfirmado(motivo: string) {
    if (!lead) return
    try {
      const atualizado = await updateLead(lead.id, { etapa: 'perdido', motivo_perda: motivo })
      setLead(atualizado)
      await carregar()
      toast.success('Lead marcado como perdido')
    } catch {
      toast.error('Erro ao actualizar lead')
    }
    setLossModal(false)
  }

  async function handleOwnerChange(ownerId: string) {
    if (!lead) return
    try {
      const atualizado = await updateLead(lead.id, { owner_id: ownerId || undefined })
      setLead(atualizado)
    } catch {
      toast.error('Erro ao actualizar responsável')
    }
  }

  async function handleCompletar(tarefaId: string) {
    try {
      await completarTarefa(tarefaId)
      setTarefas((prev) => prev.map((t) => t.id === tarefaId ? { ...t, status: 'concluida' } : t))
      toast.success('Tarefa concluída')
    } catch {
      toast.error('Erro ao completar tarefa')
    }
  }

  async function handleExportar() {
    if (!lead) return
    try {
      const dados = await exportLeadData(lead.id)
      const json = JSON.stringify(dados, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lead_${lead.id}_dados_pessoais.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Dados exportados')
    } catch {
      toast.error('Erro ao exportar dados')
    }
  }

  async function handleAnonimizar() {
    if (!lead) return
    if (!anonimizarConfirm) {
      setAnonimizarConfirm(true)
      setTimeout(() => setAnonimizarConfirm(false), 5000)
      return
    }
    try {
      await anonimizarLead(lead.id)
      toast.success('Dados anonimizados com sucesso')
      await carregar()
    } catch {
      toast.error('Erro ao anonimizar dados')
    }
    setAnonimizarConfirm(false)
  }

  async function handleArquivar() {
    if (!lead) return
    try {
      await archiveLead(lead.id)
      toast.success('Lead arquivado')
      setLead((prev) => prev ? { ...prev, estado: 'arquivado' } : null)
    } catch {
      toast.error('Erro ao arquivar')
    }
  }

  if (aCarregar) {
    return <div className="py-16 text-center text-muted-foreground">A carregar...</div>
  }

  if (!lead) {
    return <div className="py-16 text-center text-muted-foreground">Lead não encontrado</div>
  }

  const owner = lead.owner as Profile | undefined
  const tarefasPendentes = tarefas.filter((t) => t.status === 'pendente')
  const tarefasConcluidas = tarefas.filter((t) => t.status !== 'pendente')
  const perfilAdmin = perfis.find((p) => p.papel === 'admin')

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/leads" className="flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Leads
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{lead.nome}</span>
      </div>

      {/* Aviso: dados anonimizados */}
      {lead.dados_anonimizados && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Os dados pessoais deste lead foram anonimizados. Não é possível editar.
          </AlertDescription>
        </Alert>
      )}

      {/* Layout 2 colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── Coluna esquerda (60%) ── */}
        <div className="lg:col-span-3 space-y-6">

          {/* Cabeçalho */}
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">{lead.nome}</h1>
                {lead.empresa && <p className="text-muted-foreground">{lead.empresa}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                {!lead.dados_anonimizados && (
                  <Button variant="outline" size="sm" onClick={() => setFormAberto(true)}>
                    <SquarePen className="h-4 w-4 mr-1.5" />
                    Editar
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={handleArquivar} disabled={lead.estado === 'arquivado'}>
                  <Archive className="h-4 w-4 mr-1.5" />
                  Arquivar
                </Button>
              </div>
            </div>

            {/* Etapa + Owner */}
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={lead.etapa}
                onValueChange={(v) => handleEtapaChange(v as EtapaLead)}
                disabled={lead.dados_anonimizados}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ETAPAS).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>
                      <span className={cn(
                        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border',
                        ETAPA_BADGE_CLASSES[key as EtapaLead]
                      )}>
                        {label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={lead.owner_id ?? '__none__'}
                onValueChange={(v) => handleOwnerChange(v === '__none__' ? '' : v)}
                disabled={lead.dados_anonimizados}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sem responsável" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem responsável</SelectItem>
                  {perfis.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {lead.etapa === 'perdido' && lead.motivo_perda && (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">
                  Perda: {lead.motivo_perda}
                </Badge>
              )}
            </div>
          </div>

          {/* Info + acções rápidas */}
          <div className="grid grid-cols-2 gap-4 text-sm border rounded-lg p-4 bg-card">
            {lead.email && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                <a href={`mailto:${lead.email}`} className="hover:underline text-blue-600 flex items-center gap-1">
                  {lead.email}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
            {lead.telefone && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Telefone</p>
                <p>{lead.telefone}</p>
              </div>
            )}
            {lead.cidade && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Cidade</p>
                <p>{lead.cidade}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Origem</p>
              <p>{ORIGENS[lead.origem].label}</p>
            </div>
            {lead.servico && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Serviço</p>
                <Badge variant="outline" className={cn('text-xs', SERVICO_BADGE_CLASSES[lead.servico])}>
                  {SERVICOS[lead.servico].label}
                </Badge>
              </div>
            )}
            {lead.valor_estimado != null && (
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Valor estimado</p>
                <p className="font-medium">{formatarMoeda(lead.valor_estimado)}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Próxima acção</p>
              <p className={cn(
                lead.proxima_acao_em && new Date(lead.proxima_acao_em) < new Date() ? 'text-red-600 font-medium' : ''
              )}>
                {formatarData(lead.proxima_acao_em) || <span className="text-red-500">Não definida</span>}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-0.5">Criado em</p>
              <p>{formatarData(lead.created_at)}</p>
            </div>
          </div>

          {/* Links */}
          {(lead.link_google_maps || lead.link_facebook || lead.link_instagram || lead.link_outros) && (
            <div className="grid grid-cols-2 gap-3 text-sm border rounded-lg p-4 bg-card">
              <p className="col-span-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Links</p>
              {lead.link_google_maps && (
                <a href={lead.link_google_maps} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-blue-600 hover:underline truncate">
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  Google Maps
                </a>
              )}
              {lead.link_facebook && (
                <a href={lead.link_facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-blue-600 hover:underline truncate">
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  Facebook
                </a>
              )}
              {lead.link_instagram && (
                <a href={lead.link_instagram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-blue-600 hover:underline truncate">
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  Instagram
                </a>
              )}
              {lead.link_outros && (
                <a href={lead.link_outros} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-blue-600 hover:underline truncate">
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  Outros
                </a>
              )}
            </div>
          )}

          {/* Botões de acção rápida */}
          {!lead.dados_anonimizados && (
            <div className="flex flex-wrap gap-2">
              {lead.telefone && (
                <Button variant="outline" size="sm" asChild>
                  <a href={urlWhatsApp(lead.telefone, lead.nome)} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="h-4 w-4 mr-1.5 text-green-600" />
                    WhatsApp
                  </a>
                </Button>
              )}
              {lead.email && (
                <Button variant="outline" size="sm" asChild>
                  <a href={`mailto:${lead.email}?subject=Proposta - Agência`}>
                    <Mail className="h-4 w-4 mr-1.5" />
                    Enviar Email
                  </a>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setTaskFormAberto(true)}>
                <CheckSquare className="h-4 w-4 mr-1.5" />
                Nova Tarefa
              </Button>
            </div>
          )}

          {/* Notas */}
          {lead.notas && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Notas</p>
              <p className="text-sm whitespace-pre-wrap border rounded-lg p-3 bg-muted/30">{lead.notas}</p>
            </div>
          )}

          {/* Timeline */}
          <div>
            <p className="text-sm font-semibold mb-3">Actividades</p>
            {!lead.dados_anonimizados && (
              <div className="mb-4">
                <ActivityForm
                  leadId={lead.id}
                  onCriada={(a) => setAtividades((prev) => [a, ...prev])}
                />
              </div>
            )}
            <Timeline atividades={atividades} />
          </div>
        </div>

        {/* ── Coluna direita (40%) ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Tarefas */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">Tarefas</p>
              {!lead.dados_anonimizados && (
                <Button variant="ghost" size="sm" onClick={() => setTaskFormAberto(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Nova
                </Button>
              )}
            </div>

            {tarefasPendentes.length === 0 && tarefasConcluidas.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Sem tarefas. Cria a primeira!</p>
            ) : (
              <div className="space-y-2">
                {tarefasPendentes.map((t) => (
                  <TaskItem key={t.id} tarefa={t} onCompletar={handleCompletar} />
                ))}
                {tarefasConcluidas.length > 0 && (
                  <>
                    <Separator className="my-2" />
                    <p className="text-xs text-muted-foreground">Concluídas</p>
                    {tarefasConcluidas.map((t) => (
                      <TaskItem key={t.id} tarefa={t} onCompletar={handleCompletar} />
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Tags */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Tags</p>
            {lead.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {lead.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag === 'alta_intencao' ? '⭐ Alta intenção' : tag === 'pago' ? '💰 Pago' : tag}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Sem tags</p>
            )}
          </div>

          <Separator />

          {/* RGPD — só admin */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">RGPD</p>
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full" onClick={handleExportar}>
                <Download className="h-4 w-4 mr-2" />
                Exportar dados pessoais
              </Button>
              {!lead.dados_anonimizados && perfilActual?.papel === 'admin' && (
                <Button
                  variant={anonimizarConfirm ? 'destructive' : 'outline'}
                  size="sm"
                  className="w-full"
                  onClick={handleAnonimizar}
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  {anonimizarConfirm ? 'Clica novamente para confirmar' : 'Anonimizar dados'}
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                Base legal: {lead.base_legal.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modais */}
      <LeadForm
        aberto={formAberto}
        onFechar={() => setFormAberto(false)}
        onGuardado={(l) => { setLead(l); setFormAberto(false) }}
        leadEditar={lead}
      />

      <TaskForm
        aberto={taskFormAberto}
        onFechar={() => setTaskFormAberto(false)}
        onCriada={(t) => setTarefas((prev) => [t, ...prev])}
        leadId={lead.id}
        assigneePadrao={lead.owner_id ?? undefined}
      />

      <LossReasonModal
        aberto={lossModal}
        nomeLead={lead.nome}
        onConfirmar={handleLossConfirmado}
        onCancelar={() => setLossModal(false)}
      />
    </div>
  )
}
