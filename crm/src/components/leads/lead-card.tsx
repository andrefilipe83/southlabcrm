'use client'

import Link from 'next/link'
import { Phone, MessageCircle, Globe, Mail, Target, Users, Search, MoreHorizontal, Calendar } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn, formatarData, formatarMoeda, getIniciais, isAtrasado } from '@/lib/utils'
import { SERVICO_BADGE_CLASSES, SERVICOS } from '@/lib/constants'
import type { Lead, Profile } from '@/lib/types'

const ORIGEM_ICONES: Record<string, React.ComponentType<{ className?: string }>> = {
  formulario_site: Globe,
  whatsapp: MessageCircle,
  chamada: Phone,
  google_ads: Target,
  facebook_ads: Users,
  email: Mail,
  referencia: Users,
  organico: Search,
  outro: MoreHorizontal,
}

interface LeadCardProps {
  lead: Lead
  isDragging?: boolean
}

export function LeadCard({ lead, isDragging }: LeadCardProps) {
  const owner = lead.owner as Profile | undefined
  const OrigemIcon = ORIGEM_ICONES[lead.origem] ?? MoreHorizontal
  const atrasado = isAtrasado(lead.proxima_acao_em)

  return (
    <Link
      href={`/leads/${lead.id}`}
      className={cn(
        'block bg-card border rounded-lg p-3 space-y-2 shadow-sm hover:shadow-md transition-shadow cursor-pointer',
        isDragging && 'opacity-50 shadow-lg rotate-1'
      )}
      onClick={(e) => {
        // Prevenir navegação durante drag
        if (isDragging) e.preventDefault()
      }}
    >
      {/* Nome + empresa */}
      <div>
        <p className="font-medium text-sm leading-tight">{lead.nome}</p>
        {lead.empresa && (
          <p className="text-xs text-muted-foreground mt-0.5">{lead.empresa}</p>
        )}
      </div>

      {/* Badges: serviço + alta intenção */}
      <div className="flex flex-wrap gap-1">
        {lead.servico && (
          <Badge
            variant="outline"
            className={cn('text-xs px-1.5 py-0', SERVICO_BADGE_CLASSES[lead.servico])}
          >
            {SERVICOS[lead.servico].label}
          </Badge>
        )}
        {lead.tags.includes('alta_intencao') && (
          <Badge variant="outline" className="text-xs px-1.5 py-0 bg-amber-100 text-amber-700 border-amber-200">
            ⭐ Alta
          </Badge>
        )}
      </div>

      {/* Footer: origem + owner + próxima acção */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-muted-foreground">
          <OrigemIcon className="h-3.5 w-3.5 shrink-0" />
          {owner && (
            <Avatar className="h-5 w-5">
              <AvatarFallback className="text-[9px]">
                {getIniciais(owner.nome)}
              </AvatarFallback>
            </Avatar>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {lead.valor_estimado != null && (
            <span className="text-xs text-muted-foreground font-medium">
              {formatarMoeda(lead.valor_estimado)}
            </span>
          )}
          {lead.proxima_acao_em && (
            <div className={cn(
              'flex items-center gap-1 text-xs',
              atrasado ? 'text-red-600 font-medium' : 'text-muted-foreground'
            )}>
              <Calendar className="h-3 w-3" />
              {formatarData(lead.proxima_acao_em)}
            </div>
          )}
          {!lead.proxima_acao_em && lead.etapa !== 'ganho' && lead.etapa !== 'perdido' && (
            <span className="text-xs text-red-500 font-medium">Sem data</span>
          )}
        </div>
      </div>
    </Link>
  )
}
