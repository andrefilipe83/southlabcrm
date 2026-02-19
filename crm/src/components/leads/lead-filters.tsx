'use client'

import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ETAPAS, ORIGENS, SERVICOS } from '@/lib/constants'
import type { LeadFiltros, Profile } from '@/lib/types'

const ALL = '__all__'

interface LeadFiltersProps {
  filtros: LeadFiltros
  perfis: Profile[]
  onChange: (filtros: LeadFiltros) => void
}

export function LeadFilters({ filtros, perfis, onChange }: LeadFiltersProps) {
  function set(campo: keyof LeadFiltros, valor: string) {
    onChange({ ...filtros, [campo]: valor === ALL ? undefined : valor || undefined })
  }

  const temFiltros = Object.values(filtros).some((v) => v && v !== '')

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {/* Pesquisa */}
      <div className="relative flex-1 min-w-48">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar nome, empresa, email, telefone..."
          value={filtros.search ?? ''}
          onChange={(e) => set('search', e.target.value)}
          className="pl-8"
        />
      </div>

      {/* Etapa */}
      <Select value={filtros.etapa ?? ALL} onValueChange={(v) => set('etapa', v)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Etapa" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todas as etapas</SelectItem>
          {Object.entries(ETAPAS).map(([key, { label }]) => (
            <SelectItem key={key} value={key}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Serviço */}
      <Select value={filtros.servico ?? ALL} onValueChange={(v) => set('servico', v)}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Serviço" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos os serviços</SelectItem>
          {Object.entries(SERVICOS).map(([key, { label }]) => (
            <SelectItem key={key} value={key}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Origem */}
      <Select value={filtros.origem ?? ALL} onValueChange={(v) => set('origem', v)}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Origem" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todas as origens</SelectItem>
          {Object.entries(ORIGENS).map(([key, { label }]) => (
            <SelectItem key={key} value={key}>{label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Owner */}
      {perfis.length > 0 && (
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
      )}

      {/* Estado */}
      <Select value={filtros.estado ?? 'ativo'} onValueChange={(v) => set('estado', v)}>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ativo">Activos</SelectItem>
          <SelectItem value="arquivado">Arquivados</SelectItem>
        </SelectContent>
      </Select>

      {/* Limpar filtros */}
      {temFiltros && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange({})}
          className="gap-1 text-muted-foreground"
        >
          <X className="h-3 w-3" />
          Limpar
        </Button>
      )}
    </div>
  )
}
