'use client'

import { useState } from 'react'
import { Phone, MessageCircle, Mail, Video, FileText, Globe, MoreHorizontal, Pencil, Check, X } from 'lucide-react'
import { cn, formatarDataRelativa } from '@/lib/utils'
import { toast } from 'sonner'
import { updateAtividade } from '@/hooks/use-atividades'
import type { Atividade, TipoAtividade, Profile } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

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
  currentUserId?: string | null
  onAtualizada?: (atualizada: Atividade) => void
}

export function Timeline({ atividades, currentUserId, onAtualizada }: TimelineProps) {
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editDescricao, setEditDescricao] = useState('')
  const [aGuardar, setAGuardar] = useState(false)

  function iniciarEdicao(atividade: Atividade) {
    setEditandoId(atividade.id)
    setEditDescricao(atividade.descricao)
  }

  function cancelarEdicao() {
    setEditandoId(null)
    setEditDescricao('')
  }

  async function guardarEdicao(atividade: Atividade) {
    const descricaoTrimmed = editDescricao.trim()
    if (!descricaoTrimmed || descricaoTrimmed === atividade.descricao) {
      cancelarEdicao()
      return
    }

    setAGuardar(true)
    try {
      const atualizada = await updateAtividade(atividade.id, descricaoTrimmed)
      onAtualizada?.(atualizada)
      toast.success('Actividade actualizada')
      cancelarEdicao()
    } catch {
      toast.error('Erro ao actualizar actividade')
    } finally {
      setAGuardar(false)
    }
  }

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
        const podeEditar = currentUserId && atividade.created_by === currentUserId
        const emEdicao = editandoId === atividade.id

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
              {emEdicao ? (
                <div className="space-y-2">
                  <Textarea
                    value={editDescricao}
                    onChange={(e) => setEditDescricao(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        guardarEdicao(atividade)
                      }
                      if (e.key === 'Escape') cancelarEdicao()
                    }}
                    className="min-h-[60px] text-sm"
                    autoFocus
                    disabled={aGuardar}
                  />
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => guardarEdicao(atividade)}
                      disabled={aGuardar}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Guardar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={cancelarEdicao}
                      disabled={aGuardar}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="group">
                  <div className="flex items-start gap-1">
                    <p className="text-sm leading-relaxed flex-1">{atividade.descricao}</p>
                    {podeEditar && (
                      <button
                        onClick={() => iniciarEdicao(atividade)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted shrink-0"
                        title="Editar"
                      >
                        <Pencil className="h-3 w-3 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {autor ? `${autor.nome} · ` : ''}
                    {formatarDataRelativa(atividade.created_at)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
