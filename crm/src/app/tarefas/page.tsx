'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { AlertTriangle } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { TaskList } from '@/components/tarefas/task-list'
import { fetchTarefas, completarTarefa, createTarefa } from '@/hooks/use-tarefas'
import { fetchProfiles } from '@/hooks/use-leads'
import { PRIORIDADES } from '@/lib/constants'
import type { Tarefa, Profile, TarefaFiltros, PrioridadeTarefa } from '@/lib/types'

// Modal "próxima acção" após completar uma tarefa
interface ProximaAcaoModalProps {
  aberto: boolean
  tarefa: Tarefa | null
  onCriar: (titulo: string) => void
  onSaltar: () => void
}

function ProximaAcaoModal({ aberto, tarefa, onCriar, onSaltar }: ProximaAcaoModalProps) {
  const [titulo, setTitulo] = useState('')

  function handleCriar() {
    if (!titulo.trim()) return
    onCriar(titulo.trim())
    setTitulo('')
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => !open && onSaltar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Qual é a próxima acção?</DialogTitle>
          <DialogDescription>
            Mantém o follow-up contínuo. Define a próxima acção para este lead.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="proxima">Próxima acção</Label>
            <Textarea
              id="proxima"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Ligar de novo na semana que vem..."
              rows={2}
              autoFocus
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={onSaltar}>
              Saltar
            </Button>
            <Button onClick={handleCriar} disabled={!titulo.trim()}>
              Criar tarefa
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function TarefasPage() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([])
  const [perfis, setPerfis] = useState<Profile[]>([])
  const [aCarregar, setACarregar] = useState(true)
  const [filtros, setFiltros] = useState<TarefaFiltros>({ status: 'pendente' })
  const [proximaAcaoModal, setProximaAcaoModal] = useState<Tarefa | null>(null)

  const carregar = useCallback(async () => {
    setACarregar(true)
    try {
      const [ts, ps] = await Promise.all([
        fetchTarefas({ ...filtros, status: 'pendente' }),
        fetchProfiles(),
      ])
      setTarefas(ts)
      setPerfis(ps)
    } catch {
      toast.error('Erro ao carregar tarefas')
    } finally {
      setACarregar(false)
    }
  }, [filtros])

  useEffect(() => { carregar() }, [carregar])

  async function handleCompletar(id: string) {
    try {
      await completarTarefa(id)
      const tarefa = tarefas.find((t) => t.id === id)
      setTarefas((prev) => prev.filter((t) => t.id !== id))
      if (tarefa) setProximaAcaoModal(tarefa)
    } catch {
      toast.error('Erro ao completar tarefa')
    }
  }

  async function handleCriarProxima(titulo: string) {
    if (!proximaAcaoModal) return
    try {
      const amanha = new Date()
      amanha.setDate(amanha.getDate() + 1)
      amanha.setHours(9, 0, 0, 0)

      await createTarefa({
        lead_id: proximaAcaoModal.lead_id,
        titulo,
        due_at: amanha.toISOString(),
        assigned_to: proximaAcaoModal.assigned_to,
        prioridade: 'media',
      })
      toast.success('Próxima acção criada')
      carregar()
    } catch {
      toast.error('Erro ao criar próxima acção')
    }
    setProximaAcaoModal(null)
  }

  // Filtrar por período client-side (dados já carregados sem filtro de data)
  const agora = new Date()
  const fimHoje = new Date(agora); fimHoje.setHours(23, 59, 59, 999)
  const fimSemana = new Date(agora); fimSemana.setDate(agora.getDate() + 7)

  const hoje = tarefas.filter((t) => new Date(t.due_at) <= fimHoje && new Date(t.due_at) >= agora)
  const atrasadas = tarefas.filter((t) => new Date(t.due_at) < agora)
  const semana = tarefas.filter((t) => new Date(t.due_at) > fimHoje && new Date(t.due_at) <= fimSemana)
  const todas = tarefas

  const ALL = '__all__'

  function set(campo: keyof TarefaFiltros, valor: string) {
    setFiltros((prev) => ({ ...prev, [campo]: valor === ALL ? undefined : valor || undefined }))
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tarefas</h1>
          {atrasadas.length > 0 && (
            <p className="text-sm text-red-600 font-medium flex items-center gap-1 mt-0.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              {atrasadas.length} tarefa{atrasadas.length !== 1 ? 's' : ''} atrasada{atrasadas.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Filtros */}
        <div className="flex gap-2">
          <Select value={filtros.assigned_to ?? ALL} onValueChange={(v) => set('assigned_to', v)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              {perfis.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filtros.prioridade ?? ALL} onValueChange={(v) => set('prioridade', v)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas</SelectItem>
              {Object.entries(PRIORIDADES).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="hoje">
        <TabsList>
          <TabsTrigger value="hoje">
            Hoje
            {hoje.length > 0 && (
              <span className="ml-1.5 bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5 font-medium">
                {hoje.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="atrasadas">
            Atrasadas
            {atrasadas.length > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 font-medium">
                {atrasadas.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="semana">Esta semana</TabsTrigger>
          <TabsTrigger value="todas">Todas</TabsTrigger>
        </TabsList>

        {aCarregar ? (
          <div className="py-12 text-center text-muted-foreground text-sm">A carregar...</div>
        ) : (
          <>
            <TabsContent value="hoje" className="mt-4">
              <TaskList
                tarefas={hoje}
                onCompletar={handleCompletar}
                vazio="Sem tarefas para hoje. Bom trabalho!"
              />
            </TabsContent>

            <TabsContent value="atrasadas" className="mt-4">
              <TaskList
                tarefas={atrasadas}
                onCompletar={handleCompletar}
                vazio="Sem tarefas atrasadas. Excelente!"
              />
            </TabsContent>

            <TabsContent value="semana" className="mt-4">
              <TaskList
                tarefas={semana}
                onCompletar={handleCompletar}
                vazio="Sem tarefas nos próximos 7 dias."
              />
            </TabsContent>

            <TabsContent value="todas" className="mt-4">
              <TaskList
                tarefas={todas}
                onCompletar={handleCompletar}
                vazio="Sem tarefas pendentes."
              />
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Modal próxima acção */}
      <ProximaAcaoModal
        aberto={!!proximaAcaoModal}
        tarefa={proximaAcaoModal}
        onCriar={handleCriarProxima}
        onSaltar={() => setProximaAcaoModal(null)}
      />
    </div>
  )
}
