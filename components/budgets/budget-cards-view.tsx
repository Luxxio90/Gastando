'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BudgetCard, Category } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Plus, ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { BudgetCardDialog } from './budget-card-dialog'

interface Props {
  cards: BudgetCard[]
  categories: Category[]
  resolvedAmounts: Record<string, number>
  incomeByCat: Record<string, number>
  expenseByCat: Record<string, number>
  userId: string
  month: number
  year: number
}

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function prevMonth(month: number, year: number) {
  return month === 1 ? { month: 12, year: year - 1 } : { month: month - 1, year }
}
function nextMonth(month: number, year: number) {
  return month === 12 ? { month: 1, year: year + 1 } : { month: month + 1, year }
}

export function BudgetCardsView({ cards, categories, resolvedAmounts, incomeByCat, expenseByCat, userId, month, year }: Props) {
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
    else { toast.success('Fila eliminada'); router.refresh() }
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
  const totalExpense = expenseCards.reduce((s, c) => s + (resolvedAmounts[c.id] ?? 0), 0)
  const unassigned = totalIncome - totalExpense

  function pct(amount: number) {
    if (!totalIncome || totalIncome === 0) return null
    return ((amount / totalIncome) * 100).toFixed(1)
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Presupuesto</h1>
          <div className="flex items-center gap-1 mt-0.5">
            <button onClick={() => { const p = prevMonth(month, year); navigate(p.month, p.year) }}
              className="p-1 rounded hover:bg-gray-100 text-gray-400 transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-gray-500 font-medium min-w-32 text-center">{MONTHS[month - 1]} {year}</span>
            <button onClick={() => { const n = nextMonth(month, year); navigate(n.month, n.year) }}
              className="p-1 rounded hover:bg-gray-100 text-gray-400 transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <Button onClick={openCreate} size="sm" className="bg-gray-900 hover:bg-gray-800">
          <Plus className="h-4 w-4 mr-1" /> Agregar fila
        </Button>
      </div>

      {cards.length === 0 ? (
        <div className="text-center text-gray-400 py-16 border-2 border-dashed border-gray-200 rounded-xl">
          <p className="font-medium">Tabla vacía</p>
          <p className="text-sm mt-1">Agregá una fila de ingreso para comenzar</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          {/* Columnas header */}
          <div className="grid grid-cols-[1fr_56px_120px_32px] bg-gray-50 border-b border-gray-200 px-4 py-2.5">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Categoría</span>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide text-center">%</span>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Monto</span>
            <span />
          </div>

          {/* Filas de Ingresos */}
          {incomeCards.length > 0 && (
            <>
              <div className="px-4 py-1.5 bg-emerald-50 border-b border-emerald-100">
                <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wide">Ingresos</span>
              </div>
              {incomeCards.map(card => {
                const amount = resolvedAmounts[card.id] ?? 0
                const p = pct(amount)
                return (
                  <div key={card.id} className="grid grid-cols-[1fr_56px_120px_32px] items-center px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{card.name}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {card.calc_type === 'category_sum' && card.sum_category
                          ? `${card.sum_category.icon} ${card.sum_category.name}`
                          : 'Manual'}
                      </p>
                    </div>
                    <div className="text-center">
                      {p !== null ? (
                        <span className="text-xs font-semibold text-emerald-600">{p}%</span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-emerald-700">{formatCurrency(amount)}</span>
                    </div>
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="p-1 rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(card)}>Editar</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(card.id)}>Eliminar</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )
              })}
              {/* Subtotal ingresos */}
              <div className="grid grid-cols-[1fr_56px_120px_32px] items-center px-4 py-2 bg-emerald-50 border-b border-emerald-100">
                <span className="text-xs font-semibold text-emerald-700">Total ingresos</span>
                <span className="text-center text-xs font-bold text-emerald-600">100%</span>
                <span className="text-right text-sm font-bold text-emerald-700">{formatCurrency(totalIncome)}</span>
                <span />
              </div>
            </>
          )}

          {/* Filas de Gastos */}
          {expenseCards.length > 0 && (
            <>
              <div className="px-4 py-1.5 bg-blue-50 border-b border-blue-100">
                <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wide">Distribución de gastos</span>
              </div>
              {expenseCards.map(card => {
                const amount = resolvedAmounts[card.id] ?? 0
                const p = pct(amount)
                return (
                  <div key={card.id} className="grid grid-cols-[1fr_56px_120px_32px] items-center px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{card.name}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {card.calc_type === 'category_sum' && card.sum_category
                          ? `${card.sum_category.icon} ${card.sum_category.name}`
                          : 'Manual'}
                      </p>
                    </div>
                    <div className="text-center">
                      {p !== null ? (
                        <span className="text-xs font-semibold text-blue-600">{p}%</span>
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-gray-800">{formatCurrency(amount)}</span>
                    </div>
                    <div className="flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="p-1 rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(card)}>Editar</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(card.id)}>Eliminar</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )
              })}
              {/* Subtotal gastos */}
              <div className="grid grid-cols-[1fr_56px_120px_32px] items-center px-4 py-2 bg-blue-50 border-b border-blue-100">
                <span className="text-xs font-semibold text-blue-700">Total distribuido</span>
                <span className="text-center text-xs font-bold text-blue-600">{totalIncome > 0 ? `${((totalExpense / totalIncome) * 100).toFixed(1)}%` : '—'}</span>
                <span className="text-right text-sm font-bold text-blue-700">{formatCurrency(totalExpense)}</span>
                <span />
              </div>
            </>
          )}

          {/* Sin asignar */}
          {totalIncome > 0 && (
            <div className="grid grid-cols-[1fr_56px_120px_32px] items-center px-4 py-3 bg-gray-50">
              <span className="text-sm font-semibold text-gray-600">Sin asignar</span>
              <span className="text-center text-xs font-semibold text-gray-500">
                {totalIncome > 0 ? `${((unassigned / totalIncome) * 100).toFixed(1)}%` : '—'}
              </span>
              <span className={`text-right text-sm font-bold ${unassigned >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {formatCurrency(unassigned)}
              </span>
              <span />
            </div>
          )}
        </div>
      )}

      <BudgetCardDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingCard(null) }}
        categories={categories}
        userId={userId}
        month={month}
        year={year}
        editing={editingCard}
        incomeByCat={incomeByCat}
        expenseByCat={expenseByCat}
      />
    </div>
  )
}
