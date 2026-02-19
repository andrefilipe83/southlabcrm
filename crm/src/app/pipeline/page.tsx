'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { KanbanBoard } from '@/components/pipeline/kanban-board'
import { fetchLeads, fetchProfiles } from '@/hooks/use-leads'
import { ORIGENS, SERVICOS } from '@/lib/constants'
import type { Lead, LeadFiltros, Profile, EtapaLead } from '@/lib/types'

const ALL = '__all__'

export default function PipelinePage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [perfis, setPerfis] = useState<Profile[]>([])
  const [filtros, setFiltros] = useState<LeadFiltros>({})
  const [aCarregar, setACarregar] = useState(true)

  const carregar = useCallback(async () => {
    setACarregar(true)
    try {
      const [ls, ps] = await Promise.all([fetchLeads({ ...filtros, estado: 'ativo' }), fetchProfiles()])
      setLeads(ls)
      setPerfis(ps)
    } catch {
      toast.error('Erro ao carregar pipeline')
    } finally {
      setACarregar(false)
    }
  }, [filtros])

  useEffect(() => { carregar() }, [carregar])

  function handleLeadMovido(id: string, novaEtapa: EtapaLead) {
    setLeads((prev) =>
      prev.map((l) => l.id === id ? { ...l, etapa: novaEtapa } : l)
    )
  }

  function set(campo: keyof LeadFiltros, valor: string) {
    setFiltros((prev) => ({ ...prev, [campo]: valor === ALL ? undefined : valor || undefined }))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pipeline</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {aCarregar ? 'A carregar...' : `${leads.length} leads activos`}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <Select value={filtros.owner_id ?? ALL} onValueChange={(v) => set('owner_id', v)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos</SelectItem>
            {perfis.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtros.origem ?? ALL} onValueChange={(v) => set('origem', v)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Origem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas</SelectItem>
            {Object.entries(ORIGENS).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filtros.servico ?? ALL} onValueChange={(v) => set('servico', v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Serviço" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos</SelectItem>
            {Object.entries(SERVICOS).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filtros.tags?.[0] ?? ALL}
          onValueChange={(v) => setFiltros((prev) => ({ ...prev, tags: v === ALL ? undefined : [v] }))}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Tags" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as tags</SelectItem>
            <SelectItem value="alta_intencao">⭐ Alta intenção</SelectItem>
            <SelectItem value="pago">Pago (Ads)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Board */}
      {aCarregar ? (
        <div className="py-16 text-center text-muted-foreground text-sm">
          A carregar pipeline...
        </div>
      ) : (
        <KanbanBoard leads={leads} onLeadMovido={handleLeadMovido} />
      )}
    </div>
  )
}
