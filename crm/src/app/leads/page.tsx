'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Download } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { LeadTable } from '@/components/leads/lead-table'
import { LeadFilters } from '@/components/leads/lead-filters'
import { LeadForm } from '@/components/leads/lead-form'
import { fetchLeads, fetchProfiles, archiveLead } from '@/hooks/use-leads'
import { formatarData, formatarMoeda } from '@/lib/utils'
import { ETAPAS, ORIGENS, SERVICOS } from '@/lib/constants'
import type { Lead, LeadFiltros, Profile } from '@/lib/types'

type Coluna = 'nome' | 'empresa' | 'etapa' | 'servico' | 'origem' | 'owner' | 'proxima_acao_em' | 'valor_estimado' | 'created_at'

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [perfis, setPerfis] = useState<Profile[]>([])
  const [filtros, setFiltros] = useState<LeadFiltros>({})
  const [ordenacao, setOrdenacao] = useState<{ coluna: Coluna; direcao: 'asc' | 'desc' }>({
    coluna: 'created_at',
    direcao: 'desc',
  })
  const [aCarregar, setACarregar] = useState(true)
  const [formAberto, setFormAberto] = useState(false)

  const carregarLeads = useCallback(async () => {
    setACarregar(true)
    try {
      const [data, ps] = await Promise.all([fetchLeads(filtros), fetchProfiles()])
      setLeads(data)
      setPerfis(ps)
    } catch {
      toast.error('Erro ao carregar leads')
    } finally {
      setACarregar(false)
    }
  }, [filtros])

  useEffect(() => {
    carregarLeads()
  }, [carregarLeads])

  function handleOrdenar(coluna: Coluna) {
    setOrdenacao((prev) => ({
      coluna,
      direcao: prev.coluna === coluna && prev.direcao === 'asc' ? 'desc' : 'asc',
    }))
  }

  const leadsOrdenados = [...leads].sort((a, b) => {
    const col = ordenacao.coluna
    const dir = ordenacao.direcao === 'asc' ? 1 : -1

    if (col === 'owner') {
      const na = (a.owner as Profile | undefined)?.nome ?? ''
      const nb = (b.owner as Profile | undefined)?.nome ?? ''
      return na.localeCompare(nb) * dir
    }

    const va = (a as unknown as Record<string, unknown>)[col] ?? ''
    const vb = (b as unknown as Record<string, unknown>)[col] ?? ''

    if (typeof va === 'number' && typeof vb === 'number') {
      return (va - vb) * dir
    }

    return String(va).localeCompare(String(vb)) * dir
  })

  async function handleArquivar(id: string) {
    try {
      await archiveLead(id)
      toast.success('Lead arquivado')
      carregarLeads()
    } catch {
      toast.error('Erro ao arquivar lead')
    }
  }

  function exportarCSV() {
    const header = ['Nome', 'Empresa', 'Email', 'Telefone', 'Origem', 'Serviço', 'Etapa', 'Responsável', 'Próxima acção', 'Valor', 'Criado em']
    const linhas = leadsOrdenados.map((l) => [
      l.nome,
      l.empresa ?? '',
      l.email ?? '',
      l.telefone ?? '',
      ORIGENS[l.origem].label,
      l.servico ? SERVICOS[l.servico].label : '',
      ETAPAS[l.etapa].label,
      (l.owner as Profile | undefined)?.nome ?? '',
      l.proxima_acao_em ? formatarData(l.proxima_acao_em) : '',
      l.valor_estimado != null ? formatarMoeda(l.valor_estimado) : '',
      formatarData(l.created_at),
    ])

    const csv = [header, ...linhas]
      .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `leads_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {aCarregar ? 'A carregar...' : `${leads.length} leads`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportarCSV} disabled={leads.length === 0}>
            <Download className="h-4 w-4 mr-1.5" />
            Exportar CSV
          </Button>
          <Button onClick={() => setFormAberto(true)} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Novo Lead
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <LeadFilters filtros={filtros} perfis={perfis} onChange={setFiltros} />

      {/* Tabela */}
      <div className="border rounded-lg bg-card">
        {aCarregar ? (
          <div className="py-16 text-center text-muted-foreground text-sm">
            A carregar leads...
          </div>
        ) : (
          <LeadTable
            leads={leadsOrdenados}
            ordenacao={ordenacao}
            onOrdenar={handleOrdenar}
            onArquivar={handleArquivar}
          />
        )}
      </div>

      {/* Modal de criação */}
      <LeadForm
        aberto={formAberto}
        onFechar={() => setFormAberto(false)}
        onGuardado={() => { setFormAberto(false); carregarLeads() }}
      />
    </div>
  )
}
