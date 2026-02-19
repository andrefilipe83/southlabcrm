'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createTarefa } from '@/hooks/use-tarefas'
import { fetchProfiles } from '@/hooks/use-leads'
import { PRIORIDADES } from '@/lib/constants'
import type { Profile, Tarefa, TarefaFormData, PrioridadeTarefa } from '@/lib/types'

interface TaskFormProps {
  aberto: boolean
  onFechar: () => void
  onCriada: (tarefa: Tarefa) => void
  leadId: string
  assigneePadrao?: string
}

export function TaskForm({ aberto, onFechar, onCriada, leadId, assigneePadrao }: TaskFormProps) {
  const [perfis, setPerfis] = useState<Profile[]>([])
  const [aGuardar, setAGuardar] = useState(false)
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    due_at: '',
    assigned_to: assigneePadrao ?? '',
    prioridade: 'media' as PrioridadeTarefa,
  })

  useEffect(() => {
    fetchProfiles().then(setPerfis).catch(() => {})
  }, [])

  useEffect(() => {
    if (aberto) {
      // Default: amanhã
      const amanha = new Date()
      amanha.setDate(amanha.getDate() + 1)
      amanha.setHours(9, 0, 0, 0)
      setForm({
        titulo: '',
        descricao: '',
        due_at: amanha.toISOString().slice(0, 16),
        assigned_to: assigneePadrao ?? perfis[0]?.id ?? '',
        prioridade: 'media',
      })
    }
  }, [aberto, assigneePadrao, perfis])

  function set(campo: string, valor: string) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titulo.trim() || !form.due_at || !form.assigned_to) return

    setAGuardar(true)
    try {
      const dados: TarefaFormData = {
        lead_id: leadId,
        titulo: form.titulo,
        descricao: form.descricao || undefined,
        due_at: new Date(form.due_at).toISOString(),
        assigned_to: form.assigned_to,
        prioridade: form.prioridade,
      }
      const tarefa = await createTarefa(dados)
      toast.success('Tarefa criada')
      onCriada(tarefa)
      onFechar()
    } catch {
      toast.error('Erro ao criar tarefa')
    } finally {
      setAGuardar(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => !open && onFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Tarefa</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título *</Label>
            <Input
              id="titulo"
              value={form.titulo}
              onChange={(e) => set('titulo', e.target.value)}
              placeholder="O que fazer..."
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="due_at">Data/hora *</Label>
              <Input
                id="due_at"
                type="datetime-local"
                value={form.due_at}
                onChange={(e) => set('due_at', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={form.prioridade} onValueChange={(v) => set('prioridade', v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORIDADES).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {perfis.length > 0 && (
            <div className="space-y-2">
              <Label>Atribuir a *</Label>
              <Select value={form.assigned_to} onValueChange={(v) => set('assigned_to', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {perfis.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={form.descricao}
              onChange={(e) => set('descricao', e.target.value)}
              placeholder="Detalhes adicionais..."
              rows={2}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onFechar}>Cancelar</Button>
            <Button type="submit" disabled={aGuardar}>
              {aGuardar ? 'A criar...' : 'Criar tarefa'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
