'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BudgetCard, Category, Account } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Plus, ChevronLeft, ChevronRight, ChevronDown, MoreVertical, AlertTriangle, Target } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { BudgetCardDialog } from './budget-card-dialog'

interface Props {
  cards: BudgetCard[]
  categories: Category[]
  resolvedAmounts: Record<string, number>
  actualByCard: Record<string, number>
  incomeByCat: Record<string, number>
  expenseByCat: Record<string, number>
  accounts: Account[]
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

export function BudgetCardsView({ cards, categories, resolvedAmounts, actualByCard, incomeByCat, expenseByCat, accounts, userId, month, year }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCard, setEditingCard] = useState<BudgetCard | null>(null)
  const [collapsed, setCollapsed] = useState(false)

  function navigate(m: number, y: number) { router.push(`/budgets?month=${m}&year=${y}`) }

  async function handleDelete(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('budget_cards').delete().eq('id', id)
    if (error) toast.error('Error al eliminar')
    else { toast.success('Fila eliminada'); router.refresh() }
  }

  function openEdit(card: BudgetCard) { setEditingCard(card); setTimeout(() => setDialogOpen(true), 0) }
  function openCreate() { setEditingCard(null); setDialogOpen(true) }

  const incomeCards  = cards.filter(c => c.card_type === 'income')
  const expenseCards = cards.filter(c => c.card_type === 'expense')
  const totalIncome  = incomeCards.reduce((s, c) => s + (resolvedAmounts[c.id] ?? 0), 0)
  const totalExpense = expenseCards.reduce((s, c) => s + (resolvedAmounts[c.id] ?? 0), 0)
  const unassigned   = totalIncome - totalExpense

  function pct(amount: number) {
    if (!totalIncome) return null
    return ((amount / totalIncome) * 100).toFixed(1)
  }

  function calcLabel(card: BudgetCard) {
    if (card.calc_type === 'category_sum' && card.sum_category)
      return `${card.sum_category.icon} ${card.sum_category.name}`
    if (card.calc_type === 'percentage' && card.source_card_id)
      return `${card.percentage}% de ${cards.find(c => c.id === card.source_card_id)?.name ?? '...'}`
    return 'Manual'
  }

  const INCOME_COLOR  = '#00CB96'
  const EXPENSE_COLOR = '#7C4DFF'

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Distribución</h1>
          <div className="flex items-center gap-1 mt-0.5">
            <button
              onClick={() => { const p = prevMonth(month, year); navigate(p.month, p.year) }}
              className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-muted-foreground font-medium min-w-32 text-center">
              {MONTHS[month - 1]} {year}
            </span>
            <button
              onClick={() => { const n = nextMonth(month, year); navigate(n.month, n.year) }}
              className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <Button
          onClick={openCreate}
          size="sm"
          className="font-semibold"
          style={{ background: 'linear-gradient(135deg, #7C4DFF 0%, #9C6DFF 100%)', color: '#fff', border: 'none' }}
        >
          <Plus className="h-4 w-4 mr-1" /> Agregar fila
        </Button>
      </div>

      {cards.length === 0 ? (
        <div className="text-center text-muted-foreground py-16 border-2 border-dashed border-border rounded-xl">
          <p className="font-medium">Tabla vacía</p>
          <p className="text-sm mt-1">Agregá una fila de ingreso para comenzar</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          {/* Header columnas */}
          <button
            type="button"
            onClick={() => setCollapsed(c => !c)}
            className="w-full grid grid-cols-[1fr_56px_120px_32px] items-center bg-muted/40 border-b border-border px-4 py-2.5 text-left transition-colors hover:bg-muted/60"
            style={{ borderBottom: collapsed ? 'none' : undefined }}
          >
            <div className="flex items-center gap-1.5">
              <ChevronDown
                className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 flex-shrink-0"
                style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
              />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Categoría</span>
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-center">%</span>
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-right">Monto</span>
            <span />
          </button>

          {/* Sección Ingresos */}
          {!collapsed && incomeCards.length > 0 && (
            <>
              <div className="px-4 py-2 border-b border-border/50" style={{ backgroundColor: INCOME_COLOR + '12' }}>
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: INCOME_COLOR }}>
                  Ingresos
                </span>
              </div>
              {incomeCards.map(card => {
                const amount = resolvedAmounts[card.id] ?? 0
                const p = pct(amount)
                return (
                  <div
                    key={card.id}
                    className="grid grid-cols-[1fr_56px_120px_32px] items-center px-4 py-3 border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => openEdit(card)}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{card.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{calcLabel(card)}</p>
                    </div>
                    <div className="flex justify-center">
                      {p !== null ? (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ color: INCOME_COLOR, backgroundColor: INCOME_COLOR + '18' }}
                        >
                          {p}%
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold tabular-nums" style={{ color: INCOME_COLOR }}>
                        {formatCurrency(amount)}
                      </span>
                    </div>
                    <div className="flex justify-end" onClick={e => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="p-1 rounded text-muted-foreground/40 hover:text-foreground hover:bg-muted/60 transition-colors">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(card)}>Editar</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-500" onClick={() => handleDelete(card.id)}>Eliminar</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )
              })}
              {/* Subtotal ingresos */}
              <div
                className="grid grid-cols-[1fr_56px_120px_32px] items-center px-4 py-2.5 border-b border-border/50"
                style={{ backgroundColor: INCOME_COLOR + '10' }}
              >
                <span className="text-xs font-bold" style={{ color: INCOME_COLOR }}>Total ingresos</span>
                <span className="text-center text-[10px] font-bold" style={{ color: INCOME_COLOR }}>100%</span>
                <span className="text-right text-sm font-bold tabular-nums" style={{ color: INCOME_COLOR }}>{formatCurrency(totalIncome)}</span>
                <span />
              </div>
            </>
          )}

          {/* Sección Gastos */}
          {!collapsed && expenseCards.length > 0 && (
            <>
              <div className="px-4 py-2 border-b border-border/50" style={{ backgroundColor: EXPENSE_COLOR + '12' }}>
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: EXPENSE_COLOR }}>
                  Distribución de gastos
                </span>
              </div>
              {expenseCards.map(card => {
                const amount = resolvedAmounts[card.id] ?? 0
                const p = pct(amount)
                const barWidth = totalIncome > 0 ? Math.min(100, (amount / totalIncome) * 100) : 0
                return (
                  <div
                    key={card.id}
                    className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => openEdit(card)}
                  >
                    <div className="grid grid-cols-[1fr_56px_120px_32px] items-center px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{card.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{calcLabel(card)}</p>
                      </div>
                      <div className="flex justify-center">
                        {p !== null ? (
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ color: EXPENSE_COLOR, backgroundColor: EXPENSE_COLOR + '18' }}
                          >
                            {p}%
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/40">—</span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(amount)}</span>
                      </div>
                      <div className="flex justify-end" onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="p-1 rounded text-muted-foreground/40 hover:text-foreground hover:bg-muted/60 transition-colors">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(card)}>Editar</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-500" onClick={() => handleDelete(card.id)}>Eliminar</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    {/* Mini barra de porcentaje del ingreso total */}
                    {barWidth > 0 && (
                      <div className="h-0.5 mx-4 mb-0 bg-muted/40 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${barWidth}%`, backgroundColor: EXPENSE_COLOR + 'aa' }}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
              {/* Subtotal gastos */}
              <div
                className="grid grid-cols-[1fr_56px_120px_32px] items-center px-4 py-2.5 border-b border-border/50"
                style={{ backgroundColor: EXPENSE_COLOR + '10' }}
              >
                <span className="text-xs font-bold" style={{ color: EXPENSE_COLOR }}>Total distribuido</span>
                <span className="text-center text-[10px] font-bold" style={{ color: EXPENSE_COLOR }}>
                  {totalIncome > 0 ? `${((totalExpense / totalIncome) * 100).toFixed(1)}%` : '—'}
                </span>
                <span className="text-right text-sm font-bold tabular-nums" style={{ color: EXPENSE_COLOR }}>{formatCurrency(totalExpense)}</span>
                <span />
              </div>
            </>
          )}

          {/* Sin asignar */}
          {!collapsed && totalIncome > 0 && (
            <div className="grid grid-cols-[1fr_56px_120px_32px] items-center px-4 py-3 bg-muted/30">
              <span className="text-sm font-semibold text-muted-foreground">Sin asignar</span>
              <span className="text-center text-[10px] font-semibold text-muted-foreground">
                {totalIncome > 0 ? `${((unassigned / totalIncome) * 100).toFixed(1)}%` : '—'}
              </span>
              <span
                className="text-right text-sm font-bold tabular-nums"
                style={{ color: unassigned >= 0 ? INCOME_COLOR : '#FF4D6D' }}
              >
                {formatCurrency(unassigned)}
              </span>
              <span />
            </div>
          )}
        </div>
      )}

      {/* Sección de seguimiento */}
      {cards.filter(c => c.track_account_id).length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Target className="h-3.5 w-3.5" />
            Seguimiento
          </h2>
          {cards.filter(c => c.track_account_id).map(card => {
            const budget  = resolvedAmounts[card.id] ?? 0
            const actual  = actualByCard[card.id] ?? 0
            const remaining = budget - actual
            const pctUsed = budget > 0 ? Math.min(100, (actual / budget) * 100) : 0
            const exceeded = actual > budget
            const account = accounts.find(a => a.id === card.track_account_id)
            const color = exceeded ? '#FF4D6D' : pctUsed >= 80 ? '#F59E0B' : '#00CB96'

            return (
              <div
                key={card.id}
                className="bg-card rounded-xl border overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                style={{ borderColor: exceeded ? '#FF4D6D40' : 'hsl(var(--border))' }}
                onClick={() => openEdit(card)}
              >
                {/* Barra de progreso */}
                <div className="h-1 bg-muted/40">
                  <div
                    className="h-full transition-all duration-500"
                    style={{ width: `${pctUsed}%`, backgroundColor: color }}
                  />
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        {exceeded && <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" style={{ color: '#FF4D6D' }} />}
                        <p className="font-semibold text-sm text-foreground">{card.name}</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{account?.name ?? '—'}</p>
                      {exceeded && card.exceeded_at && (
                        <p className="text-[11px] mt-0.5 font-semibold" style={{ color: '#FF4D6D' }}>
                          Superado el {new Date(card.exceeded_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}
                        </p>
                      )}
                    </div>
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0"
                      style={{ color, backgroundColor: color + '18', border: `1px solid ${color}40` }}
                    >
                      {pctUsed.toFixed(0)}%
                    </span>
                  </div>

                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-xs">Presupuesto</span>
                      <span className="font-semibold tabular-nums text-foreground">{formatCurrency(budget)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-xs">Gastado</span>
                      <span className="font-semibold tabular-nums" style={{ color }}>{formatCurrency(actual)}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-border/50 pt-1.5 mt-1.5">
                      <span className="text-xs font-semibold text-foreground">{exceeded ? 'Te pasaste' : 'Restante'}</span>
                      <span className="font-bold tabular-nums text-base" style={{ color }}>
                        {exceeded ? '+' : ''}{formatCurrency(Math.abs(remaining))}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <BudgetCardDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingCard(null) }}
        categories={categories}
        cards={cards}
        resolvedAmounts={resolvedAmounts}
        accounts={accounts}
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
