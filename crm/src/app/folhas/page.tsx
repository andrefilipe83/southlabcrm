'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  ExternalLink,
  Plus,
  Pencil,
  Trash2,
  FileSpreadsheet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
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
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

// ── Tipos ─────────────────────────────────────────────────────────────────────

type Estado = 'por_iniciar' | 'em_progresso' | 'terminado'

interface FolhaLead {
  id: string
  nome: string
  url: string
  estado: Estado
  notas: string | null
  created_at: string
  updated_at: string
}

interface FolhaFormData {
  nome: string
  url: string
  estado: Estado
  notas: string
}

// ── Configuração de estados ────────────────────────────────────────────────────

const ESTADOS: Record<Estado, { label: string; classes: string }> = {
  por_iniciar: {
    label: 'Por iniciar',
    classes: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  em_progresso: {
    label: 'Em progresso',
    classes: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  terminado: {
    label: 'Terminado',
    classes: 'bg-green-100 text-green-700 border-green-200',
  },
}

const ESTADO_VAZIO: FolhaFormData = {
  nome: '',
  url: '',
  estado: 'por_iniciar',
  notas: '',
}

// ── Funções Supabase ───────────────────────────────────────────────────────────

async function fetchFolhas(): Promise<FolhaLead[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('folhas_leads')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data as FolhaLead[]
}

async function criarFolha(dados: FolhaFormData): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('folhas_leads').insert({
    nome: dados.nome.trim(),
    url: dados.url.trim(),
    estado: dados.estado,
    notas: dados.notas.trim() || null,
  })
  if (error) throw new Error(error.message)
}

async function atualizarFolha(id: string, dados: Partial<FolhaFormData>): Promise<void> {
  const supabase = createClient()
  const payload: Record<string, unknown> = {}
  if (dados.nome !== undefined) payload.nome = dados.nome.trim()
  if (dados.url !== undefined) payload.url = dados.url.trim()
  if (dados.estado !== undefined) payload.estado = dados.estado
  if (dados.notas !== undefined) payload.notas = dados.notas.trim() || null
  const { error } = await supabase.from('folhas_leads').update(payload).eq('id', id)
  if (error) throw new Error(error.message)
}

async function eliminarFolha(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('folhas_leads').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Modal Criar / Editar ───────────────────────────────────────────────────────

interface ModalFolhaProps {
  aberto: boolean
  folha: FolhaLead | null
  onFechar: () => void
  onGuardado: () => void
}

function ModalFolha({ aberto, folha, onFechar, onGuardado }: ModalFolhaProps) {
  const [form, setForm] = useState<FolhaFormData>(ESTADO_VAZIO)
  const [aGuardar, setAGuardar] = useState(false)

  useEffect(() => {
    if (folha) {
      setForm({
        nome: folha.nome,
        url: folha.url,
        estado: folha.estado,
        notas: folha.notas ?? '',
      })
    } else {
      setForm(ESTADO_VAZIO)
    }
  }, [folha, aberto])

  function set(campo: keyof FolhaFormData, valor: string) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  async function handleGuardar() {
    if (!form.nome.trim() || !form.url.trim()) {
      toast.error('Nome e URL são obrigatórios')
      return
    }
    setAGuardar(true)
    try {
      if (folha) {
        await atualizarFolha(folha.id, form)
        toast.success('Folha actualizada')
      } else {
        await criarFolha(form)
        toast.success('Folha adicionada')
      }
      onGuardado()
      onFechar()
    } catch {
      toast.error('Erro ao guardar folha')
    } finally {
      setAGuardar(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(open) => !open && onFechar()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{folha ? 'Editar folha' : 'Adicionar folha de leads'}</DialogTitle>
          <DialogDescription>
            Liga uma folha Google Sheets (ou outra fonte) para acompanhar os leads.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome</Label>
            <Input
              id="nome"
              value={form.nome}
              onChange={(e) => set('nome', e.target.value)}
              placeholder="Ex: Leads - Odemira e Algarve"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="url">URL da folha</Label>
            <Input
              id="url"
              value={form.url}
              onChange={(e) => set('url', e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/..."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="estado">Estado</Label>
            <Select value={form.estado} onValueChange={(v) => set('estado', v as Estado)}>
              <SelectTrigger id="estado">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(ESTADOS) as [Estado, { label: string }][]).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notas">Notas <span className="text-muted-foreground">(opcional)</span></Label>
            <Textarea
              id="notas"
              value={form.notas}
              onChange={(e) => set('notas', e.target.value)}
              placeholder="Informação adicional sobre esta folha..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onFechar} disabled={aGuardar}>
              Cancelar
            </Button>
            <Button onClick={handleGuardar} disabled={aGuardar}>
              {aGuardar ? 'A guardar…' : 'Guardar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Confirmação de eliminação ──────────────────────────────────────────────────

interface ModalEliminarProps {
  aberto: boolean
  nome: string
  onConfirmar: () => void
  onCancelar: () => void
}

function ModalEliminar({ aberto, nome, onConfirmar, onCancelar }: ModalEliminarProps) {
  return (
    <Dialog open={aberto} onOpenChange={(open) => !open && onCancelar()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Eliminar folha</DialogTitle>
          <DialogDescription>
            Tens a certeza que queres eliminar <strong>{nome}</strong>? Esta acção não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onCancelar}>Cancelar</Button>
          <Button variant="destructive" onClick={onConfirmar}>Eliminar</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Página principal ───────────────────────────────────────────────────────────

export default function FolhasPage() {
  const [folhas, setFolhas] = useState<FolhaLead[]>([])
  const [aCarregar, setACarregar] = useState(true)
  const [modalAberto, setModalAberto] = useState(false)
  const [folhaEditar, setFolhaEditar] = useState<FolhaLead | null>(null)
  const [folhaEliminar, setFolhaEliminar] = useState<FolhaLead | null>(null)

  const carregar = useCallback(async () => {
    setACarregar(true)
    try {
      setFolhas(await fetchFolhas())
    } catch {
      toast.error('Erro ao carregar folhas')
    } finally {
      setACarregar(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  function abrirCriar() {
    setFolhaEditar(null)
    setModalAberto(true)
  }

  function abrirEditar(folha: FolhaLead) {
    setFolhaEditar(folha)
    setModalAberto(true)
  }

  async function handleMudarEstado(folha: FolhaLead, estado: Estado) {
    try {
      await atualizarFolha(folha.id, { estado })
      setFolhas((prev) => prev.map((f) => f.id === folha.id ? { ...f, estado } : f))
    } catch {
      toast.error('Erro ao actualizar estado')
    }
  }

  async function handleEliminar() {
    if (!folhaEliminar) return
    try {
      await eliminarFolha(folhaEliminar.id)
      setFolhas((prev) => prev.filter((f) => f.id !== folhaEliminar.id))
      toast.success('Folha eliminada')
    } catch {
      toast.error('Erro ao eliminar folha')
    }
    setFolhaEliminar(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Folhas de Leads</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {folhas.length} folha{folhas.length !== 1 ? 's' : ''} registada{folhas.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={abrirCriar} className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar folha
        </Button>
      </div>

      {/* Conteúdo */}
      {aCarregar ? (
        <div className="py-20 text-center text-muted-foreground text-sm">A carregar…</div>
      ) : folhas.length === 0 ? (
        <div className="py-20 text-center">
          <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-sm">Ainda não adicionaste nenhuma folha de leads.</p>
          <Button variant="outline" className="mt-4 gap-2" onClick={abrirCriar}>
            <Plus className="h-4 w-4" />
            Adicionar primeira folha
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {folhas.map((folha) => (
            <div
              key={folha.id}
              className="rounded-lg border bg-card p-4 space-y-3 flex flex-col"
            >
              {/* Nome + acções */}
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold leading-snug line-clamp-2">{folha.nome}</p>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => abrirEditar(folha)}
                    title="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setFolhaEliminar(folha)}
                    title="Eliminar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* URL */}
              <a
                href={folha.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 hover:underline truncate"
                title={folha.url}
              >
                <ExternalLink className="h-3 w-3 shrink-0" />
                <span className="truncate">{folha.url}</span>
              </a>

              {/* Notas */}
              {folha.notas && (
                <p className="text-xs text-muted-foreground line-clamp-2">{folha.notas}</p>
              )}

              {/* Estado (select inline) */}
              <div className="mt-auto pt-1">
                <Select
                  value={folha.estado}
                  onValueChange={(v) => handleMudarEstado(folha, v as Estado)}
                >
                  <SelectTrigger className={cn(
                    'h-7 text-xs border font-medium',
                    ESTADOS[folha.estado].classes
                  )}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(ESTADOS) as [Estado, { label: string; classes: string }][]).map(
                      ([key, { label, classes }]) => (
                        <SelectItem key={key} value={key}>
                          <Badge variant="outline" className={cn('text-xs font-medium', classes)}>
                            {label}
                          </Badge>
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <ModalFolha
        aberto={modalAberto}
        folha={folhaEditar}
        onFechar={() => setModalAberto(false)}
        onGuardado={carregar}
      />

      <ModalEliminar
        aberto={!!folhaEliminar}
        nome={folhaEliminar?.nome ?? ''}
        onConfirmar={handleEliminar}
        onCancelar={() => setFolhaEliminar(null)}
      />
    </div>
  )
}
