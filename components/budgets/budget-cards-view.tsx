'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BudgetCard, Category } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Plus, MoreVertical, ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { BudgetCardDialog } from './budget-card-dialog'

interface Props {
  cards: BudgetCard[]
  categories: Category[]
  resolvedAmounts: Record<string, number>
  spentAmounts: Record<string, number>
  userId: string
  month: number
  year: number
}

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const CALC_LABELS: Record<string, string> = {
  manual: 'Manual',
  category_sum: 'Suma categoría',
  percentage: '% de tarjeta',
}

function prevMonth(month: number, year: number) {
  return month === 1 ? { month: 12, year: year - 1 } : { month: month - 1, year }
}
function nextMonth(month: number, year: number) {
  return month === 12 ? { month: 1, year: year + 1 } : { month: month + 1, year }
}

export function BudgetCardsView({ cards, categories, resolvedAmounts, spentAmounts, userId, month, year }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<BudgetCard | null>(null)

  function navigate(m: number, y: number) {
    router.push(`/budgets?month=${m}&year=${y}`)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('budget_cards').delete().eq('id', id)
    if (error) toast.error('Error al eliminar')
    else { toast.success('Tarjeta eliminada'); router.refresh() }
  }

  function openEdit(card: BudgetCard) {
    setEditingCard(card)
    setDialogOpen(true)
  }

  function openCreate() {
    setEditingCard(null)
    setDialogOpen(true)
  }

  const incomeCards = cards.filter(c => c.card_type === 'income')
  const expenseCards = cards.filter(c => c.card_type === 'expense')

  const totalIncome = incomeCards.reduce((s, c) => s + (resolvedAmounts[c.id] ?? 0), 0)
  const totalBudgeted = expenseCards.reduce((s, c) => s + (resolvedAmounts[c.id] ?? 0), 0)
  const totalSpent = expenseCards.reduce((s, c) => s + (spentAmounts[c.id] ?? 0), 0)

  return (
    <div className="space-y-6">
      {/* Header con navegación de mes */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Presupuestos</h1>
          <div className="flex items-center gap-2 mt-1">
            <button onClick={() => { const p = prevMonth(month, year); navigate(p.month, p.year) }}
              className="p-1 rounded-md hover:bg-gray-100 text-gray-500 transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-gray-600 min-w-28 text-center">{MONTHS[month - 1]} {year}</span>
            <button onClick={() => { const n = nextMonth(month, year); navigate(n.month, n.year) }}
              className="p-1 rounded-md hover:bg-gray-100 text-gray-500 transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" /> Nueva tarjeta
        </Button>
      </div>

      {/* Resumen del mes */}
      {cards.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-emerald-50 rounded-xl p-3 text-center">
            <p className="text-xs text-emerald-600 font-medium">Ingresos</p>
            <p className="text-lg font-bold text-emerald-700 mt-0.5">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <p className="text-xs text-blue-600 font-medium">Presupuestado</p>
            <p className="text-lg font-bold text-blue-700 mt-0.5">{formatCurrency(totalBudgeted)}</p>
          </div>
          <div className="bg-orange-50 rounded-xl p-3 text-center">
            <p className="text-xs text-orange-600 font-medium">Gastado</p>
            <p className="text-lg font-bold text-orange-700 mt-0.5">{formatCurrency(totalSpent)}</p>
          </div>
        </div>
      )}

      {cards.length === 0 ? (
        <div className="text-center text-gray-400 py-16">
          <p className="text-base font-medium">No hay tarjetas este mes</p>
          <p className="text-sm mt-1">Creá una tarjeta de ingreso o gasto para empezar</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Ingresos */}
          {incomeCards.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" /> Ingresos
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {incomeCards.map(card => {
                  const amount = resolvedAmounts[card.id] ?? 0
                  return (
                    <Card key={card.id} className="relative overflow-hidden">
                      <div className="h-1.5" style={{ backgroundColor: card.color }} />
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-semibold truncate">{card.name}</CardTitle>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(card)}>Editar</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(card.id)}>Eliminar</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </CardHeader>
                      <CardContent className="pb-4">
                        <p className="text-2xl font-bold" style={{ color: card.color }}>{formatCurrency(amount)}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {card.calc_type === 'category_sum' && card.sum_category
                            ? `Suma de ${card.sum_category.icon} ${card.sum_category.name}`
                            : CALC_LABELS[card.calc_type]}
                        </p>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          {/* Gastos */}
          {expenseCards.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <TrendingDown className="h-3.5 w-3.5" /> Gastos
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {expenseCards.map(card => {
                  const budget = resolvedAmounts[card.id] ?? 0
                  const spent = spentAmounts[card.id] ?? 0
                  const hasTracking = !!card.track_category_id
                  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0
                  const over = hasTracking && spent > budget

                  return (
                    <Card key={card.id} className="relative overflow-hidden">
                      <div className="h-1.5" style={{ backgroundColor: card.color }} />
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-semibold truncate">{card.name}</CardTitle>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(card)}>Editar</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(card.id)}>Eliminar</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </CardHeader>
                      <CardContent className="space-y-3 pb-4">
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(budget)}</p>
                        <p className="text-xs text-gray-400">
                          {card.calc_type === 'percentage' && card.source_card_id
                            ? `${card.percentage}% · ${CALC_LABELS.percentage}`
                            : card.calc_type === 'category_sum' && card.sum_category
                              ? `Suma de ${card.sum_category.icon} ${card.sum_category.name}`
                              : 'Manual'}
                        </p>
                        {hasTracking && (
                          <>
                            <div className="flex justify-between text-xs">
                              <span className={over ? 'text-red-500 font-semibold' : 'text-gray-500'}>
                                {formatCurrency(spent)} gastado
                              </span>
                              <span className="text-gray-400">de {formatCurrency(budget)}</span>
                            </div>
                            <Progress value={pct} className={over ? '[&>div]:bg-red-500' : '[&>div]:bg-emerald-500'} />
                            <p className="text-xs text-gray-400">
                              {over
                                ? `⚠️ Excedido en ${formatCurrency(spent - budget)}`
                                : `Disponible: ${formatCurrency(budget - spent)}`}
                            </p>
                          </>
                        )}
                        {!hasTracking && (
                          <p className="text-xs text-gray-300 italic">Sin categoría de seguimiento</p>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <BudgetCardDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingCard(null) }}
        categories={categories}
        cards={cards}
        resolvedAmounts={resolvedAmounts}
        userId={userId}
        month={month}
        year={year}
        editing={editingCard}
      />
    </div>
  )
}
