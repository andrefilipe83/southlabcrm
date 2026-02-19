'use client'

import { Users, AlertTriangle, Clock, CheckSquare, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatarMoeda } from '@/lib/utils'

interface StatsCardsProps {
  totalLeads: number
  semProximaAcao: number
  atrasados: number
  tarefasHoje: number
  valorPipeline: number
}

export function StatsCards({
  totalLeads,
  semProximaAcao,
  atrasados,
  tarefasHoje,
  valorPipeline,
}: StatsCardsProps) {
  const cards = [
    {
      titulo: 'Leads Activos',
      valor: totalLeads,
      icone: Users,
      alerta: false,
      descricao: 'total no pipeline',
    },
    {
      titulo: 'Sem Próxima Acção',
      valor: semProximaAcao,
      icone: AlertTriangle,
      alerta: semProximaAcao > 0,
      descricao: semProximaAcao > 0 ? 'leads precisam de atenção' : 'tudo em dia',
    },
    {
      titulo: 'Follow-ups Atrasados',
      valor: atrasados,
      icone: Clock,
      alerta: atrasados > 0,
      descricao: atrasados > 0 ? 'leads com atraso' : 'nenhum atrasado',
    },
    {
      titulo: 'Tarefas para Hoje',
      valor: tarefasHoje,
      icone: CheckSquare,
      alerta: tarefasHoje > 5,
      descricao: 'pendentes hoje',
    },
    {
      titulo: 'Valor do Pipeline',
      valor: formatarMoeda(valorPipeline),
      icone: TrendingUp,
      alerta: false,
      descricao: 'valor total estimado',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {cards.map(({ titulo, valor, icone: Icon, alerta, descricao }) => (
        <Card key={titulo} className={cn(alerta && 'border-red-200 bg-red-50/50')}>
          <CardHeader className="pb-1 pt-4 px-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {titulo}
              </CardTitle>
              <Icon className={cn('h-4 w-4', alerta ? 'text-red-500' : 'text-muted-foreground')} />
            </div>
          </CardHeader>
          <CardContent className="pb-4 px-4">
            <p className={cn(
              'text-2xl font-bold',
              alerta && 'text-red-600'
            )}>
              {valor}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{descricao}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
