'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import { toast } from 'sonner'
import { KanbanColumn } from './kanban-column'
import { LeadCard } from '@/components/leads/lead-card'
import { LossReasonModal } from '@/components/leads/loss-reason-modal'
import { updateLead } from '@/hooks/use-leads'
import { ETAPAS_ORDENADAS } from '@/lib/constants'
import type { Lead, EtapaLead } from '@/lib/types'

interface KanbanBoardProps {
  leads: Lead[]
  onLeadMovido: (id: string, novaEtapa: EtapaLead) => void
}

export function KanbanBoard({ leads, onLeadMovido }: KanbanBoardProps) {
  const [leadArrastando, setLeadArrastando] = useState<Lead | null>(null)
  const [lossModal, setLossModal] = useState<{ leadId: string; nome: string; etapa: EtapaLead } | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  )

  function getLeadsPorEtapa(etapa: EtapaLead): Lead[] {
    return leads.filter((l) => l.etapa === etapa)
  }

  function handleDragStart(event: DragStartEvent) {
    const lead = leads.find((l) => l.id === event.active.id)
    setLeadArrastando(lead ?? null)
  }

  async function handleDragEnd(event: DragEndEvent) {
    setLeadArrastando(null)
    const { active, over } = event

    if (!over) return

    const leadId = active.id as string
    const novaEtapa = over.id as EtapaLead
    const lead = leads.find((l) => l.id === leadId)

    if (!lead || lead.etapa === novaEtapa) return

    // Se mover para perdido, pedir motivo primeiro
    if (novaEtapa === 'perdido') {
      setLossModal({ leadId, nome: lead.nome, etapa: novaEtapa })
      return
    }

    await moverLead(leadId, novaEtapa)
  }

  async function moverLead(id: string, etapa: EtapaLead, motivoPerda?: string) {
    try {
      const dados: Record<string, unknown> = { etapa }
      if (motivoPerda) dados.motivo_perda = motivoPerda

      await updateLead(id, dados)
      onLeadMovido(id, etapa)
    } catch {
      toast.error('Erro ao mover lead. Tenta novamente.')
    }
  }

  async function handleLossConfirmado(motivo: string) {
    if (!lossModal) return
    await moverLead(lossModal.leadId, 'perdido', motivo)
    setLossModal(null)
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {ETAPAS_ORDENADAS.map((etapa) => (
            <KanbanColumn
              key={etapa}
              etapa={etapa}
              leads={getLeadsPorEtapa(etapa)}
            />
          ))}
        </div>

        <DragOverlay>
          {leadArrastando && (
            <div className="w-64 opacity-90 shadow-2xl rotate-2">
              <LeadCard lead={leadArrastando} isDragging />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {lossModal && (
        <LossReasonModal
          aberto={!!lossModal}
          nomeLead={lossModal.nome}
          onConfirmar={handleLossConfirmado}
          onCancelar={() => setLossModal(null)}
        />
      )}
    </>
  )
}
