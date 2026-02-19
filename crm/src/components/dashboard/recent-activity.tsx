'use client'

import Link from 'next/link'
import { Phone, MessageCircle, Mail, Video, FileText, Globe, MoreHorizontal } from 'lucide-react'
import { cn, formatarDataRelativa } from '@/lib/utils'
import type { Atividade, TipoAtividade, Profile } from '@/lib/types'

const TIPO_ICONES: Record<TipoAtividade, React.ComponentType<{ className?: string }>> = {
  chamada: Phone,
  whatsapp: MessageCircle,
  email: Mail,
  reuniao: Video,
  nota: FileText,
  formulario: Globe,
  outro: MoreHorizontal,
}

const TIPO_CORES: Record<TipoAtividade, string> = {
  chamada: 'bg-blue-100 text-blue-600',
  whatsapp: 'bg-green-100 text-green-600',
  email: 'bg-purple-100 text-purple-600',
  reuniao: 'bg-amber-100 text-amber-600',
  nota: 'bg-slate-100 text-slate-600',
  formulario: 'bg-cyan-100 text-cyan-600',
  outro: 'bg-gray-100 text-gray-600',
}

interface RecentActivityProps {
  atividades: (Atividade & { lead?: { id: string; nome: string; empresa?: string } })[]
}

export function RecentActivity({ atividades }: RecentActivityProps) {
  if (atividades.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-6">
        Sem actividade recente.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {atividades.map((a) => {
        const Icon = TIPO_ICONES[a.tipo]
        const cor = TIPO_CORES[a.tipo]
        const autor = a.autor as Profile | undefined
        const lead = a.lead

        return (
          <div key={a.id} className="flex items-start gap-3">
            <div className={cn('h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5', cor)}>
              <Icon className="h-3.5 w-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-snug line-clamp-2">{a.descricao}</p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {lead && (
                  <Link
                    href={`/leads/${lead.id}`}
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    {lead.nome}
                    {lead.empresa ? ` · ${lead.empresa}` : ''}
                  </Link>
                )}
                {lead && <span className="text-xs text-muted-foreground">·</span>}
                {autor && <span className="text-xs text-muted-foreground">{autor.nome}</span>}
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs text-muted-foreground">{formatarDataRelativa(a.created_at)}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
