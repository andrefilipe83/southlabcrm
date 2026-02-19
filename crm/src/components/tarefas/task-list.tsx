'use client'

import Link from 'next/link'
import { TaskItem } from './task-item'
import type { Tarefa } from '@/lib/types'

interface TaskListProps {
  tarefas: Tarefa[]
  onCompletar: (id: string) => void
  vazio?: React.ReactNode
}

export function TaskList({ tarefas, onCompletar, vazio }: TaskListProps) {
  if (tarefas.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground text-sm">
        {vazio ?? 'Sem tarefas neste período.'}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {tarefas.map((t) => (
        <div key={t.id}>
          <TaskItem tarefa={t} onCompletar={onCompletar} mostrarLead />
          {t.lead && (
            <div className="pl-12 -mt-1 pb-1">
              <Link
                href={`/leads/${(t.lead as { id: string }).id}`}
                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                Ver lead →
              </Link>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
