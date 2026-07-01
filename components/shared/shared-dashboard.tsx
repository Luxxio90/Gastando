'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { Account, BudgetCard, FixedExpenseGroup, FixedExpenseItem, Category, Responsible } from '@/types'
import { ChevronLeft, ChevronRight, ChevronDown, Plus, TrendingUp, TrendingDown, CalendarDays } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const STATUS_OPTS = [
  { value: 'paid',           label: 'Pagado',         color: '#00CB96', bg: '#00CB9618', border: '#00CB9640' },
  { value: 'pending',        label: 'Pendiente',      color: '#FF4D6D', bg: '#FF4D6D18', border: '#FF4D6D40' },
  { value: 'not_applicable', label: 'No corresponde', color: '#F59E0B', bg: '#F59E0B18', border: '#F59E0B40' },
]
function statusColor(s: string) { return STATUS_OPTS.find(o => o.value === s)?.color ?? '#888' }
function statusLabel(s: string) { return STATUS_OPTS.find(o => o.value === s)?.label ?? s }

const todayLocal = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

interface SharedAccess {
  id: string; token: string; name: string; account_ids: string[]; fixed_group_names: string[]
}

interface Props {
  sharedAccess: SharedAccess
  accounts: Account[]
  transactions: any[]
  budgetCards: BudgetCard[]
  fixedGroups: FixedExpenseGroup[]
  fixedItems: FixedExpenseItem[]
  categories: Category[]
  responsibles: Responsible[]
  month: number
  year: number
}

export function SharedDashboard({ sharedAccess, accounts, transactions: initialTransactions, budgetCards, fixedGroups, fixedItems: initialItems, categories, responsibles, month, year }: Props) {
  const router = useRouter()
  const [transactions, setTransactions] = useState(initialTransactions)
  const [localItems, setLocalItems] = useState(initialItems)

  // ── Month nav ──
  function goMonth(delta: number) {
    let m = month + delta, y = year
    if (m < 1) { m = 12; y-- }
    if (m > 12) { m = 1; y++ }
    router.push(`/shared/${sharedAccess.token}?month=${m}&year=${y}`)
  }

  // ── Transaction dialog ──
  const [txOpen, setTxOpen] = useState(false)
  const [txLoading, setTxLoading] = useState(false)
  const [txForm, setTxForm] = useState({
    type: 'expense' as 'income' | 'expense',
    amount: '',
    description: '',
    date: todayLocal(),
    account_id: accounts[0]?.id ?? '',
    category_id: '',
    notes: '',
    responsible_party_id: '',
  })

  function openTx(type: 'income' | 'expense' = 'expense') {
    setTxForm({ type, amount: '', description: '', date: todayLocal(), account_id: accounts[0]?.id ?? '', category_id: '', notes: '', responsible_party_id: '' })
    setTxOpen(true)
  }

  async function handleTxSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!txForm.amount || !txForm.account_id) return
    setTxLoading(true)
    try {
      const res = await fetch('/api/shared/transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: sharedAccess.token, ...txForm }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setTransactions(prev => [json.transaction, ...prev])
      setTxOpen(false)
      toast.success(txForm.type === 'income' ? 'Ingreso registrado' : 'Gasto registrado')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message ?? 'Error al guardar')
    }
    setTxLoading(false)
  }

  // ── Fixed item dialog ──
  const [itemOpen, setItemOpen] = useState(false)
  const [itemLoading, setItemLoading] = useState(false)
  const [editingItem, setEditingItem] = useState<FixedExpenseItem | null>(null)
  const [itemForm, setItemForm] = useState({
    status: 'pending',
    amount: '',
    description: '',
    category_id: '',
    responsible: '',
    due_day: '',
    account_id: '',
  })

  function openEditItem(item: FixedExpenseItem) {
    setEditingItem(item)
    setItemForm({
      status: item.status,
      amount: item.amount.toString(),
      description: item.description ?? '',
      category_id: item.category_id ?? '',
      responsible: item.responsible ?? '',
      due_day: item.due_day?.toString() ?? '',
      account_id: item.account_id ?? '',
    })
    setItemOpen(true)
  }

  async function handleItemSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingItem) return
    setItemLoading(true)
    try {
      const res = await fetch('/api/shared/fixed-item', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: sharedAccess.token, item_id: editingItem.id, ...itemForm }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setLocalItems(prev => prev.map(i => i.id === editingItem.id ? json.item : i))
      setItemOpen(false)
      toast.success('Gasto actualizado')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message ?? 'Error al guardar')
    }
    setItemLoading(false)
  }

  // ── Collapsed groups ──
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  function toggleCollapse(id: string) {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── Computations ──
  const monthExpense = transactions.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + t.amount, 0)

  const catMap: Record<string, { cat: any; amount: number }> = {}
  for (const t of transactions.filter((t: any) => t.type === 'expense' && t.category)) {
    const id = t.category.id
    if (!catMap[id]) catMap[id] = { cat: t.category, amount: 0 }
    catMap[id].amount += t.amount
  }
  const catBreakdown = Object.values(catMap).sort((a, b) => b.amount - a.amount)

  const cardAmounts = (() => {
    const amounts = new Map<string, number>()
    for (const card of budgetCards) {
      if (card.calc_type === 'category_sum' && card.sum_category_id) {
        const txType = card.card_type === 'income' ? 'income' : 'expense'
        const sum = transactions
          .filter((t: any) => t.category_id === card.sum_category_id && t.type === txType)
          .reduce((s: number, t: any) => s + t.amount, 0)
        amounts.set(card.id, sum)
      } else if (card.manual_amount !== null) {
        amounts.set(card.id, card.manual_amount)
      }
    }
    for (const card of budgetCards) {
      if (card.calc_type === 'percentage' && card.source_card_id && card.percentage !== null) {
        const base = amounts.get(card.source_card_id) ?? 0
        amounts.set(card.id, (base * card.percentage) / 100)
      }
    }
    return amounts
  })()

  const incomeCards  = budgetCards.filter(c => c.card_type === 'income')
  const expenseCards = budgetCards.filter(c => c.card_type === 'expense')
  const totalIncome  = incomeCards.reduce((s, c) => s + (cardAmounts.get(c.id) ?? 0), 0)
  const totalExpense = expenseCards.reduce((s, c) => s + (cardAmounts.get(c.id) ?? 0), 0)
  const unassigned   = totalIncome - totalExpense

  function calcLabel(card: BudgetCard): string {
    if (card.calc_type === 'category_sum' && (card.sum_category as any)?.name)
      return `${(card.sum_category as any).icon} ${(card.sum_category as any).name}`
    if (card.calc_type === 'percentage' && card.source_card_id)
      return `${card.percentage}% de ${budgetCards.find(c => c.id === card.source_card_id)?.name ?? '...'}`
    return 'Manual'
  }

  const groupsWithItems = fixedGroups.map(g => ({
    group: g,
    items: localItems.filter(i => i.group_id === g.id),
  }))

  const expenseCategories = categories.filter(c => c.type === 'expense')
  const incomeCategories  = categories.filter(c => c.type === 'income')
  const fixedCategories   = categories.filter(c => c.type === 'fixed_expense')

  const visibleCategories = txForm.type === 'income' ? incomeCategories : expenseCategories

  return (
    <div className="min-h-screen pb-24 font-sans" style={{ backgroundColor: '#F5F5F7' }}>
      {/* Hero */}
      <div className="relative overflow-hidden px-5 pt-8 pb-14"
        style={{ background: 'linear-gradient(135deg, #00C9A7 0%, #00B4D8 100%)' }}>
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
        <div className="relative">
          <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">Gastando · Vista compartida</p>
          <h1 className="text-white text-2xl font-bold mt-0.5">{sharedAccess.name}</h1>
          <div className="flex items-center gap-3 mt-4">
            <button onClick={() => goMonth(-1)}
              className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
              <ChevronLeft className="h-4 w-4 text-white" />
            </button>
            <span className="text-white font-semibold text-sm min-w-[120px] text-center">
              {MONTHS[month - 1]} {year}
            </span>
            <button onClick={() => goMonth(1)}
              className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
              <ChevronRight className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative -mt-8 px-4 space-y-4">
        {/* Tarjetas de cuenta */}
        {accounts.map(a => {
          const inc = transactions.filter((t: any) => t.type === 'income' && t.account_id === a.id).reduce((s: number, t: any) => s + t.amount, 0)
          const exp = transactions.filter((t: any) => t.type === 'expense' && t.account_id === a.id).reduce((s: number, t: any) => s + t.amount, 0)
          return (
            <div key={a.id} className="rounded-2xl p-5 relative overflow-hidden"
              style={{ background: `linear-gradient(135deg, ${a.color} 0%, ${a.color}bb 100%)` }}>
              <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 pointer-events-none" />
              <div className="relative">
                <p className="text-[10px] font-semibold text-white/70 uppercase tracking-widest">{a.name} · Saldo actual</p>
                <p className="text-3xl font-bold text-white tabular-nums mt-1">{formatCurrency(a.balance, a.currency)}</p>
                <div className="flex gap-5 mt-4 pt-4 border-t border-white/20">
                  <div>
                    <p className="text-[10px] font-semibold text-white/60 uppercase tracking-wide">Ingresos</p>
                    <p className="font-bold text-sm tabular-nums mt-0.5 text-white">+{formatCurrency(inc, a.currency)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-white/60 uppercase tracking-wide">Gastos</p>
                    <p className="font-bold text-sm tabular-nums mt-0.5 text-white">-{formatCurrency(exp, a.currency)}</p>
                  </div>
                </div>
              </div>
            </div>
          )
        })}

        {/* Gastos por categoría */}
        {catBreakdown.length > 0 && (
          <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-border/60"
              style={{ background: 'linear-gradient(90deg, #7C4DFF10 0%, transparent 60%)' }}>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Gastos por categoría</p>
            </div>
            <div className="divide-y divide-border/50">
              {catBreakdown.map(({ cat, amount }) => {
                const pct = monthExpense > 0 ? (amount / monthExpense) * 100 : 0
                return (
                  <div key={cat.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-lg flex-shrink-0">{cat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-foreground">{cat.name}</p>
                        <span className="text-sm font-bold tabular-nums ml-2" style={{ color: '#FF4D6D' }}>
                          -{formatCurrency(amount)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #FF4D6D 0%, #FF4D6Daa 100%)' }} />
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground tabular-nums w-8 text-right flex-shrink-0">{Math.round(pct)}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Distribución */}
        {budgetCards.length > 0 && (
          <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
            <div className="grid grid-cols-[1fr_56px_120px] items-center bg-muted/40 border-b border-border px-4 py-2.5">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Categoría</span>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-center">%</span>
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-right">Monto</span>
            </div>
            {incomeCards.length > 0 && <>
              <div className="px-4 py-2 border-b border-border/50" style={{ backgroundColor: '#00CB9612' }}>
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#00CB96' }}>Ingresos</span>
              </div>
              {incomeCards.map(card => {
                const amount = cardAmounts.get(card.id) ?? 0
                const p = totalIncome > 0 ? ((amount / totalIncome) * 100).toFixed(1) : null
                return (
                  <div key={card.id} className="grid grid-cols-[1fr_56px_120px] items-center px-4 py-3 border-b border-border">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{card.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{calcLabel(card)}</p>
                    </div>
                    <div className="flex justify-center">
                      {p !== null ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: '#00CB96', backgroundColor: '#00CB9618' }}>{p}%</span> : <span className="text-xs text-muted-foreground/40">—</span>}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold tabular-nums" style={{ color: '#00CB96' }}>{formatCurrency(amount)}</span>
                    </div>
                  </div>
                )
              })}
              <div className="grid grid-cols-[1fr_56px_120px] items-center px-4 py-2.5 border-b border-border/50" style={{ backgroundColor: '#00CB9610' }}>
                <span className="text-xs font-bold" style={{ color: '#00CB96' }}>Total ingresos</span>
                <span className="text-center text-[10px] font-bold" style={{ color: '#00CB96' }}>100%</span>
                <span className="text-right text-sm font-bold tabular-nums" style={{ color: '#00CB96' }}>{formatCurrency(totalIncome)}</span>
              </div>
            </>}
            {expenseCards.length > 0 && <>
              <div className="px-4 py-2 border-b border-border/50" style={{ backgroundColor: '#7C4DFF12' }}>
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#7C4DFF' }}>Distribución de gastos</span>
              </div>
              {expenseCards.map(card => {
                const amount = cardAmounts.get(card.id) ?? 0
                const p = totalIncome > 0 ? ((amount / totalIncome) * 100).toFixed(1) : null
                const barWidth = totalIncome > 0 ? Math.min(100, (amount / totalIncome) * 100) : 0
                return (
                  <div key={card.id} className="border-b border-border">
                    <div className="grid grid-cols-[1fr_56px_120px] items-center px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{card.name}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{calcLabel(card)}</p>
                      </div>
                      <div className="flex justify-center">
                        {p !== null ? <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: '#7C4DFF', backgroundColor: '#7C4DFF18' }}>{p}%</span> : <span className="text-xs text-muted-foreground/40">—</span>}
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold tabular-nums text-foreground">{formatCurrency(amount)}</span>
                      </div>
                    </div>
                    {barWidth > 0 && (
                      <div className="h-0.5 mx-4 bg-muted/40 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${barWidth}%`, backgroundColor: '#7C4DFFaa' }} />
                      </div>
                    )}
                  </div>
                )
              })}
              <div className="grid grid-cols-[1fr_56px_120px] items-center px-4 py-2.5 border-b border-border/50" style={{ backgroundColor: '#7C4DFF10' }}>
                <span className="text-xs font-bold" style={{ color: '#7C4DFF' }}>Total distribuido</span>
                <span className="text-center text-[10px] font-bold" style={{ color: '#7C4DFF' }}>{totalIncome > 0 ? `${((totalExpense / totalIncome) * 100).toFixed(1)}%` : '—'}</span>
                <span className="text-right text-sm font-bold tabular-nums" style={{ color: '#7C4DFF' }}>{formatCurrency(totalExpense)}</span>
              </div>
            </>}
            {totalIncome > 0 && (
              <div className="grid grid-cols-[1fr_56px_120px] items-center px-4 py-3 bg-muted/30">
                <span className="text-sm font-semibold text-muted-foreground">Sin asignar</span>
                <span className="text-center text-[10px] font-semibold text-muted-foreground">{`${((unassigned / totalIncome) * 100).toFixed(1)}%`}</span>
                <span className="text-right text-sm font-bold tabular-nums" style={{ color: unassigned >= 0 ? '#00CB96' : '#FF4D6D' }}>{formatCurrency(unassigned)}</span>
              </div>
            )}
          </div>
        )}

        {/* Gastos fijos — estilo idéntico a la app */}
        {groupsWithItems.map(({ group, items }) => {
          const collapsed = collapsedGroups.has(group.id)
          const paid    = items.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
          const pending = items.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0)
          const na      = items.filter(i => i.status === 'not_applicable').reduce((s, i) => s + i.amount, 0)
          const total   = items.reduce((s, i) => s + i.amount, 0)

          return (
            <div key={group.id} className="bg-card rounded-xl border border-border overflow-hidden shadow-sm"
              style={{ borderLeft: `3px solid ${group.color}` }}>
              {/* Header */}
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
                style={{ background: `linear-gradient(90deg, ${group.color}12 0%, transparent 60%)` }}
                onClick={() => toggleCollapse(group.id)}
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <ChevronDown
                    className="h-3.5 w-3.5 text-muted-foreground/60 transition-transform duration-200 flex-shrink-0"
                    style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                  />
                  <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: group.color }} />
                  <span className="font-bold text-sm text-foreground">{group.name}</span>
                  <span className="text-[10px] font-semibold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-full">
                    {items.length}
                  </span>
                </div>
                {total > 0 && (
                  <span className="text-xs font-bold tabular-nums flex-shrink-0" style={{ color: group.color }}>
                    {formatCurrency(total)}
                  </span>
                )}
              </div>

              {!collapsed && (
                <>
                  {/* Column headers */}
                  {items.length > 0 && (
                    <div className="grid grid-cols-[1fr_112px_84px] gap-x-2 bg-muted/30 border-b border-border/50 px-4 py-2">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Categoría</span>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-center">Estado</span>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-right">Monto</span>
                    </div>
                  )}

                  {items.length === 0 ? (
                    <div className="px-4 py-5 text-center">
                      <p className="text-xs text-muted-foreground">Sin gastos en esta sección</p>
                    </div>
                  ) : (
                    <>
                      {items.map(item => {
                        const cat = categories.find(c => c.id === item.category_id) ?? (item.category as any)
                        const color = statusColor(item.status)
                        return (
                          <div
                            key={item.id}
                            onClick={() => openEditItem(item)}
                            className="grid grid-cols-[1fr_112px_84px] gap-x-2 items-center px-4 py-2.5 border-b border-border/40 hover:bg-muted/30 transition-colors cursor-pointer last:border-b-0"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">
                                {item.description || (cat ? cat.name : 'Sin descripción')}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {cat && item.description && (
                                  <span className="text-[11px] text-muted-foreground truncate">
                                    <span className="mr-0.5">{cat.icon}</span>{cat.name}
                                  </span>
                                )}
                                {item.due_day && (
                                  <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground shrink-0">
                                    <CalendarDays className="h-2.5 w-2.5" />
                                    día {item.due_day}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex justify-center">
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                                style={{ color, backgroundColor: color + '20', border: `1px solid ${color}40` }}>
                                {statusLabel(item.status)}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-semibold text-foreground tabular-nums">{formatCurrency(item.amount)}</span>
                            </div>
                          </div>
                        )
                      })}

                      {/* Totals */}
                      <div className="divide-y divide-border/30 bg-muted/20">
                        {paid > 0 && (
                          <div className="grid grid-cols-[1fr_112px_84px] gap-x-2 items-center px-4 py-1.5">
                            <span className="text-[11px] font-semibold" style={{ color: '#00CB96' }}>Pagado</span>
                            <span />
                            <span className="text-right text-[11px] font-bold tabular-nums" style={{ color: '#00CB96' }}>{formatCurrency(paid)}</span>
                          </div>
                        )}
                        {pending > 0 && (
                          <div className="grid grid-cols-[1fr_112px_84px] gap-x-2 items-center px-4 py-1.5">
                            <span className="text-[11px] font-semibold" style={{ color: '#FF4D6D' }}>Pendiente</span>
                            <span />
                            <span className="text-right text-[11px] font-bold tabular-nums" style={{ color: '#FF4D6D' }}>{formatCurrency(pending)}</span>
                          </div>
                        )}
                        {na > 0 && (
                          <div className="grid grid-cols-[1fr_112px_84px] gap-x-2 items-center px-4 py-1.5">
                            <span className="text-[11px] font-semibold" style={{ color: '#F59E0B' }}>No corresponde</span>
                            <span />
                            <span className="text-right text-[11px] font-bold tabular-nums" style={{ color: '#F59E0B' }}>{formatCurrency(na)}</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Botón "+" flotante */}
      <button
        onClick={() => openTx('expense')}
        className="fixed z-40 flex items-center justify-center rounded-full shadow-lg transition-transform active:scale-95"
        style={{
          bottom: '72px',
          right: '20px',
          width: '52px',
          height: '52px',
          background: 'linear-gradient(135deg, #00C9A7 0%, #00B4D8 100%)',
        }}
      >
        <Plus className="h-6 w-6 text-white" strokeWidth={2.5} />
      </button>

      {/* Dialog nueva transacción */}
      <Dialog open={txOpen} onOpenChange={open => { if (!open) setTxOpen(false) }}>
        <DialogContent className="sm:max-w-sm max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 border-border">
          {/* Header con selector de tipo */}
          <div className="px-5 pt-5 pb-4 border-b border-border flex-shrink-0"
            style={{ background: txForm.type === 'income' ? 'linear-gradient(135deg, #00CB9618 0%, transparent 100%)' : 'linear-gradient(135deg, #FF4D6D18 0%, transparent 100%)' }}>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: txForm.type === 'income' ? '#00CB9618' : '#FF4D6D18' }}>
                {txForm.type === 'income'
                  ? <TrendingUp className="h-4 w-4" style={{ color: '#00CB96' }} />
                  : <TrendingDown className="h-4 w-4" style={{ color: '#FF4D6D' }} />}
              </div>
              <DialogTitle className="text-base font-semibold text-foreground">
                {txForm.type === 'income' ? 'Nuevo ingreso' : 'Nuevo gasto'}
              </DialogTitle>
            </div>
            {/* Toggle tipo */}
            <div className="flex rounded-xl overflow-hidden border border-border">
              {(['expense', 'income'] as const).map(t => (
                <button key={t} type="button"
                  onClick={() => setTxForm(f => ({ ...f, type: t, category_id: '' }))}
                  className="flex-1 py-2 text-xs font-semibold transition-colors"
                  style={txForm.type === t
                    ? { backgroundColor: t === 'income' ? '#00CB96' : '#FF4D6D', color: '#fff' }
                    : { backgroundColor: 'transparent', color: 'hsl(var(--muted-foreground))' }}>
                  {t === 'income' ? 'Ingreso' : 'Gasto'}
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleTxSubmit} className="overflow-y-auto flex-1 p-5 space-y-5">
            {/* Monto */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Monto</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground/60">$</span>
                <Input
                  type="number" min="0" step="0.01" placeholder="0.00"
                  value={txForm.amount}
                  onChange={e => setTxForm(f => ({ ...f, amount: e.target.value }))}
                  required
                  className="pl-8 h-14 text-2xl font-bold bg-muted/40 border-border/60 tracking-tight"
                  style={{ color: txForm.type === 'income' ? '#00CB96' : '#FF4D6D' }}
                />
              </div>
            </div>

            {/* Cuenta */}
            {accounts.length > 1 && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Cuenta</label>
                <div className="space-y-1.5">
                  {accounts.map(a => (
                    <button key={a.id} type="button"
                      onClick={() => setTxForm(f => ({ ...f, account_id: a.id }))}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm transition-all text-left"
                      style={txForm.account_id === a.id
                        ? { backgroundColor: a.color + '18', borderColor: a.color + '55' }
                        : { backgroundColor: 'transparent', borderColor: 'hsl(var(--border))' }}>
                      <div className="w-1 h-7 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />
                      <span className="font-semibold text-foreground truncate">{a.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Categoría */}
            {visibleCategories.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Categoría</label>
                <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto">
                  {visibleCategories.map(c => {
                    const active = txForm.category_id === c.id
                    const color = c.color || '#7C4DFF'
                    return (
                      <button key={c.id} type="button"
                        onClick={() => setTxForm(f => ({ ...f, category_id: c.id }))}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all text-left"
                        style={active
                          ? { backgroundColor: color + '20', borderColor: color + '60', color: 'hsl(var(--foreground))' }
                          : { backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}>
                        <span className="text-base leading-none flex-shrink-0">{c.icon}</span>
                        <span className="truncate">{c.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Descripción */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                Descripción <span className="normal-case font-normal text-muted-foreground/60">(opcional)</span>
              </label>
              <Input
                placeholder="Descripción..."
                value={txForm.description}
                onChange={e => setTxForm(f => ({ ...f, description: e.target.value }))}
                className="bg-muted/40 border-border/60"
              />
            </div>

            {/* Fecha */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Fecha</label>
              <Input
                type="date"
                value={txForm.date}
                onChange={e => setTxForm(f => ({ ...f, date: e.target.value }))}
                required
                className="bg-muted/40 border-border/60"
              />
            </div>

            {/* Encargado */}
            {responsibles.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Encargado <span className="normal-case font-normal text-muted-foreground/60">(opcional)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  <button type="button"
                    onClick={() => setTxForm(f => ({ ...f, responsible_party_id: '' }))}
                    className="py-1.5 px-3 rounded-full text-xs font-medium border transition-all"
                    style={txForm.responsible_party_id === ''
                      ? { backgroundColor: '#7C4DFF20', borderColor: '#7C4DFF40', color: '#7C4DFF' }
                      : { backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}>
                    Sin encargado
                  </button>
                  {responsibles.map(r => (
                    <button key={r.id} type="button"
                      onClick={() => setTxForm(f => ({ ...f, responsible_party_id: r.id }))}
                      className="flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-medium border transition-all"
                      style={txForm.responsible_party_id === r.id
                        ? { backgroundColor: r.color + '20', borderColor: r.color + '60', color: r.color }
                        : { backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}>
                      <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
                      {r.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setTxOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={txLoading} className="flex-1 font-semibold"
                style={{ background: txForm.type === 'income' ? 'linear-gradient(135deg, #00CB96 0%, #00E6A6 100%)' : 'linear-gradient(135deg, #FF4D6D 0%, #FF7D94 100%)', color: '#fff', border: 'none' }}>
                {txLoading ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog editar gasto fijo */}
      <Dialog open={itemOpen} onOpenChange={open => { if (!open) setItemOpen(false) }}>
        <DialogContent className="sm:max-w-sm max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 border-border">
          <div className="px-5 pt-5 pb-4 border-b border-border flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #FF4D6D18 0%, transparent 100%)' }}>
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FF4D6D18' }}>
                <TrendingDown className="h-4 w-4" style={{ color: '#FF4D6D' }} />
              </div>
              <DialogTitle className="text-base font-semibold text-foreground">Editar gasto fijo</DialogTitle>
            </div>
          </div>

          <form onSubmit={handleItemSubmit} className="overflow-y-auto flex-1 p-5 space-y-5">
            {/* Monto */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Monto</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground/60">$</span>
                <Input
                  type="number" min="0" step="0.01" placeholder="0.00"
                  value={itemForm.amount}
                  onChange={e => setItemForm(f => ({ ...f, amount: e.target.value }))}
                  required
                  className="pl-8 h-14 text-2xl font-bold bg-muted/40 border-border/60 tracking-tight"
                  style={{ color: '#FF4D6D' }}
                />
              </div>
            </div>

            {/* Categoría */}
            {fixedCategories.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Categoría</label>
                <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto">
                  {fixedCategories.map(c => {
                    const active = itemForm.category_id === c.id
                    const color = c.color || '#7C4DFF'
                    return (
                      <button key={c.id} type="button"
                        onClick={() => setItemForm(f => ({ ...f, category_id: c.id }))}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all text-left"
                        style={active
                          ? { backgroundColor: color + '20', borderColor: color + '60', color: 'hsl(var(--foreground))' }
                          : { backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}>
                        <span className="text-base leading-none flex-shrink-0">{c.icon}</span>
                        <span className="truncate">{c.name}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Descripción */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                Descripción <span className="normal-case font-normal text-muted-foreground/60">(opcional)</span>
              </label>
              <Input
                placeholder="Ej: Gas, Internet, Alquiler..."
                value={itemForm.description}
                onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))}
                className="bg-muted/40 border-border/60"
              />
            </div>

            {/* Vencimiento */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                Vence día <span className="normal-case font-normal text-muted-foreground/60">(opcional)</span>
              </label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="number" min="1" max="31" placeholder="15"
                  value={itemForm.due_day}
                  onChange={e => setItemForm(f => ({ ...f, due_day: e.target.value }))}
                  className="pl-8 bg-muted/40 border-border/60"
                />
              </div>
            </div>

            {/* Estado */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Estado</label>
              <div className="flex flex-col gap-1.5">
                {STATUS_OPTS.map(opt => {
                  const active = itemForm.status === opt.value
                  return (
                    <button key={opt.value} type="button"
                      onClick={() => setItemForm(f => ({ ...f, status: opt.value }))}
                      className="flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-sm font-medium border transition-all text-left"
                      style={active
                        ? { backgroundColor: opt.bg, borderColor: opt.border, color: opt.color }
                        : { backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}>
                      <div className="h-2 w-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: active ? opt.color : 'hsl(var(--border))' }} />
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Cuenta de pago */}
            {itemForm.status === 'paid' && accounts.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Cuenta de pago <span className="normal-case font-normal text-muted-foreground/60">(opcional — genera gasto)</span>
                </label>
                <div className="space-y-1.5">
                  {accounts.map(a => {
                    const active = itemForm.account_id === a.id
                    return (
                      <button key={a.id} type="button"
                        onClick={() => setItemForm(f => ({ ...f, account_id: active ? '' : a.id }))}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm transition-all text-left"
                        style={active
                          ? { backgroundColor: a.color + '18', borderColor: a.color + '55' }
                          : { backgroundColor: 'transparent', borderColor: 'hsl(var(--border))' }}>
                        <div className="w-1 h-7 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate text-sm">{a.name}</p>
                          <p className="text-[11px] text-muted-foreground tabular-nums">{formatCurrency(a.balance, a.currency)}</p>
                        </div>
                        {active && <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Encargado */}
            {responsibles.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Encargado <span className="normal-case font-normal text-muted-foreground/60">(opcional)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  <button type="button"
                    onClick={() => setItemForm(f => ({ ...f, responsible: '' }))}
                    className="py-1.5 px-3 rounded-full text-xs font-medium border transition-all"
                    style={itemForm.responsible === ''
                      ? { backgroundColor: '#7C4DFF20', borderColor: '#7C4DFF40', color: '#7C4DFF' }
                      : { backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}>
                    Sin encargado
                  </button>
                  {responsibles.map(r => (
                    <button key={r.id} type="button"
                      onClick={() => setItemForm(f => ({ ...f, responsible: r.name }))}
                      className="flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-medium border transition-all"
                      style={itemForm.responsible === r.name
                        ? { backgroundColor: r.color + '20', borderColor: r.color + '60', color: r.color }
                        : { backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}>
                      <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
                      {r.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setItemOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={itemLoading} className="flex-1 font-semibold"
                style={{ background: 'linear-gradient(135deg, #FF4D6D 0%, #FF7D94 100%)', color: '#fff', border: 'none' }}>
                {itemLoading ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
