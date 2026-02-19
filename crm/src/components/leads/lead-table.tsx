'use client'

import Link from 'next/link'
import { ArrowUpDown, ChevronUp, ChevronDown, MoreHorizontal, Archive } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn, formatarData, formatarMoeda, getIniciais, isAtrasado } from '@/lib/utils'
import { ETAPA_BADGE_CLASSES, SERVICO_BADGE_CLASSES, ETAPAS, SERVICOS, ORIGENS } from '@/lib/constants'
import type { Lead } from '@/lib/types'

type Coluna = 'nome' | 'empresa' | 'etapa' | 'servico' | 'origem' | 'owner' | 'proxima_acao_em' | 'valor_estimado' | 'created_at'

interface LeadTableProps {
  leads: Lead[]
  ordenacao: { coluna: Coluna; direcao: 'asc' | 'desc' }
  onOrdenar: (coluna: Coluna) => void
  onArquivar: (id: string) => void
}

export function LeadTable({ leads, ordenacao, onOrdenar, onArquivar }: LeadTableProps) {
  function Th({ coluna, children }: { coluna: Coluna; children: React.ReactNode }) {
    const activa = ordenacao.coluna === coluna
    return (
      <th className="text-left">
        <button
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase tracking-wide hover:text-foreground px-3 py-3 w-full"
          onClick={() => onOrdenar(coluna)}
        >
          {children}
          {activa ? (
            ordenacao.direcao === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-40" />
          )}
        </button>
      </th>
    )
  }

  if (leads.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-sm">Nenhum lead encontrado</p>
        <p className="text-xs mt-1">Tenta ajustar os filtros ou cria um novo lead</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/30">
          <tr>
            <Th coluna="nome">Nome / Empresa</Th>
            <Th coluna="servico">Serviço</Th>
            <Th coluna="etapa">Etapa</Th>
            <Th coluna="origem">Origem</Th>
            <Th coluna="owner">Responsável</Th>
            <Th coluna="proxima_acao_em">Próxima acção</Th>
            <Th coluna="valor_estimado">Valor</Th>
            <Th coluna="created_at">Criado em</Th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {leads.map((lead) => (
            <tr key={lead.id} className="hover:bg-muted/20 transition-colors">
              {/* Nome + empresa */}
              <td className="px-3 py-3">
                <Link href={`/leads/${lead.id}`} className="hover:underline font-medium">
                  {lead.nome}
                </Link>
                {lead.empresa && (
                  <p className="text-xs text-muted-foreground mt-0.5">{lead.empresa}</p>
                )}
                {lead.tags.includes('alta_intencao') && (
                  <span className="inline-block mt-1 text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200">
                    ⭐ Alta intenção
                  </span>
                )}
              </td>

              {/* Serviço */}
              <td className="px-3 py-3">
                {lead.servico ? (
                  <Badge
                    variant="outline"
                    className={cn('text-xs', SERVICO_BADGE_CLASSES[lead.servico])}
                  >
                    {SERVICOS[lead.servico].label}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </td>

              {/* Etapa */}
              <td className="px-3 py-3">
                <Badge
                  variant="outline"
                  className={cn('text-xs', ETAPA_BADGE_CLASSES[lead.etapa])}
                >
                  {ETAPAS[lead.etapa].label}
                </Badge>
              </td>

              {/* Origem */}
              <td className="px-3 py-3 text-xs text-muted-foreground">
                {ORIGENS[lead.origem].label}
              </td>

              {/* Owner */}
              <td className="px-3 py-3">
                {lead.owner ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {getIniciais(lead.owner.nome)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs">{lead.owner.nome.split(' ')[0]}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-xs">—</span>
                )}
              </td>

              {/* Próxima acção */}
              <td className="px-3 py-3 text-xs">
                {lead.proxima_acao_em ? (
                  <span className={cn(isAtrasado(lead.proxima_acao_em) && 'text-red-600 font-medium')}>
                    {isAtrasado(lead.proxima_acao_em) && '⚠ '}
                    {formatarData(lead.proxima_acao_em)}
                  </span>
                ) : lead.etapa !== 'ganho' && lead.etapa !== 'perdido' ? (
                  <span className="text-red-500 text-xs font-medium">Sem data</span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>

              {/* Valor */}
              <td className="px-3 py-3 text-xs">
                {lead.valor_estimado != null ? formatarMoeda(lead.valor_estimado) : '—'}
              </td>

              {/* Criado em */}
              <td className="px-3 py-3 text-xs text-muted-foreground">
                {formatarData(lead.created_at)}
              </td>

              {/* Acções */}
              <td className="px-3 py-3">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/leads/${lead.id}`}>Ver detalhe</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-muted-foreground"
                      onClick={() => onArquivar(lead.id)}
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      Arquivar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
