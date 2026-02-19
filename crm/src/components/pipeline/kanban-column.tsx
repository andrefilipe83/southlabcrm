'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { LeadCard } from '@/components/leads/lead-card'
import { cn, formatarMoeda } from '@/lib/utils'
import { ETAPA_BADGE_CLASSES, ETAPAS } from '@/lib/constants'
import type { Lead, EtapaLead } from '@/lib/types'

// Card arrastável individual
function SortableLeadCard({ lead }: { lead: Lead }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: lead.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    >
      <LeadCard lead={lead} isDragging={isDragging} />
    </div>
  )
}

interface KanbanColumnProps {
  etapa: EtapaLead
  leads: Lead[]
}

export function KanbanColumn({ etapa, leads }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa })

  const info = ETAPAS[etapa]
  const valorTotal = leads.reduce((s, l) => s + (l.valor_estimado ?? 0), 0)
  const ids = leads.map((l) => l.id)

  return (
    <div className="flex flex-col w-64 shrink-0">
      {/* Header da coluna */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border',
              ETAPA_BADGE_CLASSES[etapa]
            )}
          >
            {info.label}
          </span>
          <span className="text-xs text-muted-foreground font-medium bg-muted rounded-full px-2 py-0.5">
            {leads.length}
          </span>
        </div>
        {valorTotal > 0 && (
          <span className="text-xs text-muted-foreground">{formatarMoeda(valorTotal)}</span>
        )}
      </div>

      {/* Zona droppable */}
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            'flex-1 rounded-lg p-2 space-y-2 min-h-32 transition-colors',
            isOver ? 'bg-muted/60 ring-2 ring-primary/30' : 'bg-muted/20'
          )}
        >
          {leads.map((lead) => (
            <SortableLeadCard key={lead.id} lead={lead} />
          ))}
          {leads.length === 0 && (
            <div className="h-16 flex items-center justify-center text-xs text-muted-foreground">
              Sem leads
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}
