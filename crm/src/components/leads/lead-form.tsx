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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { createLead, updateLead, fetchProfiles } from '@/hooks/use-leads'
import { ORIGENS, SERVICOS, ETAPAS } from '@/lib/constants'
import type { Lead, Profile, LeadFormData, EtapaLead, OrigemLead, ServicoLead } from '@/lib/types'

interface LeadFormProps {
  aberto: boolean
  onFechar: () => void
  onGuardado: (lead: Lead) => void
  leadEditar?: Lead | null
  perfilActual?: Profile | null
}

export function LeadForm({ aberto, onFechar, onGuardado, leadEditar, perfilActual }: LeadFormProps) {
  const [perfis, setPerfis] = useState<Profile[]>([])
  const [aGuardar, setAGuardar] = useState(false)

  const [form, setForm] = useState<Partial<LeadFormData>>({
    nome: '',
    empresa: '',
    email: '',
    telefone: '',
    origem: 'outro',
    cidade: '',
    notas: '',
    etapa: 'novo',
  })

  useEffect(() => {
    fetchProfiles().then(setPerfis).catch(() => {})
  }, [])

  useEffect(() => {
    if (leadEditar) {
      setForm({
        nome: leadEditar.nome,
        empresa: leadEditar.empresa ?? '',
        email: leadEditar.email ?? '',
        telefone: leadEditar.telefone ?? '',
        origem: leadEditar.origem,
        cidade: leadEditar.cidade ?? '',
        servico: leadEditar.servico ?? undefined,
        etapa: leadEditar.etapa,
        valor_estimado: leadEditar.valor_estimado ?? undefined,
        owner_id: leadEditar.owner_id ?? undefined,
        notas: leadEditar.notas ?? '',
      })
    } else {
      setForm({
        nome: '',
        empresa: '',
        email: '',
        telefone: '',
        origem: 'outro',
        cidade: '',
        notas: '',
        etapa: 'novo',
        owner_id: perfilActual?.id,
      })
    }
  }, [leadEditar, perfilActual, aberto])

  function set(campo: string, valor: string | number | undefined) {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nome?.trim()) return

    setAGuardar(true)
    try {
      const dados: LeadFormData = {
        nome: form.nome!,
        empresa: form.empresa || undefined,
        email: form.email || undefined,
        telefone: form.telefone || undefined,
        origem: (form.origem as OrigemLead) || 'outro',
        cidade: form.cidade || undefined,
        servico: form.servico as ServicoLead | undefined,
        etapa: (form.etapa as EtapaLead) || 'novo',
        valor_estimado: form.valor_estimado,
        owner_id: form.owner_id || undefined,
        notas: form.notas || undefined,
      }

      let lead: Lead
      if (leadEditar) {
        lead = await updateLead(leadEditar.id, dados)
        toast.success('Lead actualizado com sucesso')
      } else {
        lead = await createLead(dados)
        toast.success('Lead criado com sucesso')
      }

      onGuardado(lead)
      onFechar()
    } catch (err) {
      toast.error('Erro ao guardar lead. Tenta novamente.')
    } finally {
      setAGuardar(false)
    }
  }

  return (
    <Sheet open={aberto} onOpenChange={(open) => !open && onFechar()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto px-6">
        <SheetHeader>
          <SheetTitle>{leadEditar ? 'Editar Lead' : 'Novo Lead'}</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              value={form.nome ?? ''}
              onChange={(e) => set('nome', e.target.value)}
              placeholder="Nome do contacto"
              required
            />
          </div>

          {/* Empresa */}
          <div className="space-y-2">
            <Label htmlFor="empresa">Empresa</Label>
            <Input
              id="empresa"
              value={form.empresa ?? ''}
              onChange={(e) => set('empresa', e.target.value)}
              placeholder="Nome da empresa"
            />
          </div>

          {/* Email + Telefone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email ?? ''}
                onChange={(e) => set('email', e.target.value)}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={form.telefone ?? ''}
                onChange={(e) => set('telefone', e.target.value)}
                placeholder="+351 912 345 678"
              />
            </div>
          </div>

          {/* Origem */}
          <div className="space-y-2">
            <Label>Origem *</Label>
            <Select
              value={form.origem ?? 'outro'}
              onValueChange={(v) => set('origem', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ORIGENS).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Serviço + Etapa */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Serviço</Label>
              <Select
                value={form.servico ?? ''}
                onValueChange={(v) => set('servico', v || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SERVICOS).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Etapa</Label>
              <Select
                value={form.etapa ?? 'novo'}
                onValueChange={(v) => set('etapa', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ETAPAS).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cidade + Valor */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                value={form.cidade ?? ''}
                onChange={(e) => set('cidade', e.target.value)}
                placeholder="Lisboa"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valor">Valor estimado (€)</Label>
              <Input
                id="valor"
                type="number"
                min="0"
                step="100"
                value={form.valor_estimado ?? ''}
                onChange={(e) => set('valor_estimado', e.target.value ? Number(e.target.value) : undefined)}
                placeholder="1500"
              />
            </div>
          </div>

          {/* Owner */}
          {perfis.length > 0 && (
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select
                value={form.owner_id ?? ''}
                onValueChange={(v) => set('owner_id', v || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sem responsável" />
                </SelectTrigger>
                <SelectContent>
                  {perfis.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <Textarea
              id="notas"
              value={form.notas ?? ''}
              onChange={(e) => set('notas', e.target.value)}
              placeholder="Informação relevante sobre o lead..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={aGuardar} className="flex-1">
              {aGuardar ? 'A guardar...' : (leadEditar ? 'Guardar alterações' : 'Criar lead')}
            </Button>
            <Button type="button" variant="outline" onClick={onFechar}>
              Cancelar
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
