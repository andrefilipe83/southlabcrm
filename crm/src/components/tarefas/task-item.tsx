'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn, formatarDataHora, getIniciais, isAtrasado } from '@/lib/utils'
import { PRIORIDADE_BADGE_CLASSES, PRIORIDADES } from '@/lib/constants'
import type { Tarefa } from '@/lib/types'

interface TaskItemProps {
  tarefa: Tarefa
  onCompletar: (id: string) => void
  mostrarLead?: boolean
}

export function TaskItem({ tarefa, onCompletar, mostrarLead = false }: TaskItemProps) {
  const concluida = tarefa.status === 'concluida'
  const atrasada = !concluida && isAtrasado(tarefa.due_at)

  return (
    <div className={cn(
      'flex items-start gap-3 py-3 px-4 rounded-lg border transition-colors',
      concluida ? 'bg-muted/30 opacity-60' : 'bg-card',
      atrasada && !concluida && 'border-red-200 bg-red-50/50'
    )}>
      <Checkbox
        checked={concluida}
        disabled={concluida}
        onCheckedChange={() => !concluida && onCompletar(tarefa.id)}
        className="mt-0.5"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={cn(
              'text-sm font-medium leading-tight',
              concluida && 'line-through text-muted-foreground'
            )}>
              {tarefa.titulo}
            </p>
            {mostrarLead && tarefa.lead && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {(tarefa.lead as { nome: string; empresa?: string }).nome}
                {(tarefa.lead as { nome: string; empresa?: string }).empresa && ` · ${(tarefa.lead as { nome: string; empresa?: string }).empresa}`}
              </p>
            )}
            {tarefa.descricao && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{tarefa.descricao}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge
              variant="outline"
              className={cn('text-xs px-1.5 py-0', PRIORIDADE_BADGE_CLASSES[tarefa.prioridade])}
            >
              {PRIORIDADES[tarefa.prioridade].label}
            </Badge>
            {tarefa.assignee && (
              <Avatar className="h-5 w-5">
                <AvatarFallback className="text-[9px]">
                  {getIniciais(tarefa.assignee.nome)}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>

        <p className={cn(
          'text-xs mt-1',
          atrasada ? 'text-red-600 font-medium' : 'text-muted-foreground'
        )}>
          {atrasada && '⚠ '}
          {concluida ? 'Concluída' : formatarDataHora(tarefa.due_at)}
        </p>
      </div>
    </div>
  )
}
