'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface LossReasonModalProps {
  aberto: boolean
  nomeLead: string
  onConfirmar: (motivo: string) => void
  onCancelar: () => void
}

export function LossReasonModal({ aberto, nomeLead, onConfirmar, onCancelar }: LossReasonModalProps) {
  const [motivo, setMotivo] = useState('')

  function handleConfirmar() {
    if (!motivo.trim()) return
    onConfirmar(motivo.trim())
    setMotivo('')
  }

  function handleCancelar() {
    setMotivo('')
    onCancelar()
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => !open && handleCancelar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Motivo de perda</DialogTitle>
          <DialogDescription>
            Porque é que o lead <strong>{nomeLead}</strong> foi perdido? Este campo é obrigatório.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo *</Label>
            <Textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Preço acima do orçamento, escolheu outro fornecedor, projecto cancelado..."
              rows={3}
              autoFocus
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleCancelar}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmar}
              disabled={!motivo.trim()}
            >
              Confirmar perda
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
