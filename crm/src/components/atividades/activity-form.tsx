'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createAtividade } from '@/hooks/use-atividades'
import { TIPOS_ATIVIDADE } from '@/lib/constants'
import type { Atividade, AtividadeFormData, TipoAtividade } from '@/lib/types'

interface ActivityFormProps {
  leadId: string
  onCriada: (atividade: Atividade) => void
}

export function ActivityForm({ leadId, onCriada }: ActivityFormProps) {
  const [tipo, setTipo] = useState<TipoAtividade>('nota')
  const [descricao, setDescricao] = useState('')
  const [aEnviar, setAEnviar] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!descricao.trim()) return

    setAEnviar(true)
    try {
      const dados: AtividadeFormData = { lead_id: leadId, tipo, descricao }
      const atividade = await createAtividade(dados)
      onCriada(atividade)
      setDescricao('')
      toast.success('Actividade registada')
    } catch {
      toast.error('Erro ao registar actividade')
    } finally {
      setAEnviar(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <Select value={tipo} onValueChange={(v) => setTipo(v as TipoAtividade)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(TIPOS_ATIVIDADE).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Textarea
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Descreve a interacção..."
          rows={1}
          className="flex-1 min-h-9 resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSubmit(e)
            }
          }}
        />
        <Button type="submit" size="icon" disabled={!descricao.trim() || aEnviar}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </form>
  )
}
