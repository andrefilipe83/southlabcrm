'use client'

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

interface TimelineProps {
  atividades: Atividade[]
}

export function Timeline({ atividades }: TimelineProps) {
  if (atividades.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Sem actividades registadas. Regista a primeira interacção acima.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {atividades.map((atividade, i) => {
        const Icon = TIPO_ICONES[atividade.tipo]
        const corIcone = TIPO_CORES[atividade.tipo]
        const autor = atividade.autor as Profile | undefined

        return (
          <div key={atividade.id} className="flex gap-3">
            {/* Ícone + linha vertical */}
            <div className="flex flex-col items-center">
              <div className={cn('h-7 w-7 rounded-full flex items-center justify-center shrink-0', corIcone)}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              {i < atividades.length - 1 && (
                <div className="w-px flex-1 bg-border mt-1 mb-0 min-h-4" />
              )}
            </div>

            {/* Conteúdo */}
            <div className="flex-1 pb-3 min-w-0">
              <p className="text-sm leading-relaxed">{atividade.descricao}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {autor ? `${autor.nome} · ` : ''}
                {formatarDataRelativa(atividade.created_at)}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
