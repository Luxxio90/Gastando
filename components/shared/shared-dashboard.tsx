'use client'

import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { Account, BudgetCard, FixedExpenseGroup, FixedExpenseItem } from '@/types'
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import Link from 'next/link'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

interface SharedAccess {
  id: string
  token: string
  name: string
  account_ids: string[]
  fixed_group_names: string[]
}

interface Props {
  sharedAccess: SharedAccess
  accounts: Account[]
  transactions: any[]
  budgetCards: BudgetCard[]
  fixedGroups: FixedExpenseGroup[]
  fixedItems: FixedExpenseItem[]
  month: number
  year: number
}

export function SharedDashboard({ sharedAccess, accounts, transactions, budgetCards, fixedGroups, fixedItems, month, year }: Props) {
  const router = useRouter()

  const monthExpense = transactions.filter((t: any) => t.type === 'expense').reduce((s: number, t: any) => s + t.amount, 0)

  // Gastos por categoría
  const catMap: Record<string, { cat: any; amount: number }> = {}
  for (const t of transactions.filter((t: any) => t.type === 'expense' && t.category)) {
    const id = t.category.id
    if (!catMap[id]) catMap[id] = { cat: t.category, amount: 0 }
    catMap[id].amount += t.amount
  }
  const catBreakdown = Object.values(catMap).sort((a, b) => b.amount - a.amount)

  const cardAmounts = (() => {
    const amounts = new Map<string, number>()
    // Primera pasada: manual y suma por categoría
    for (const card of budgetCards) {
      if (card.manual_amount !== null) {
        amounts.set(card.id, card.manual_amount)
      } else if (card.sum_category_id) {
        const sum = transactions
          .filter((t: any) => t.category_id === card.sum_category_id && t.type === 'expense')
          .reduce((s: number, t: any) => s + t.amount, 0)
        amounts.set(card.id, sum)
      }
    }
    // Segunda pasada: porcentaje de otra card
    for (const card of budgetCards) {
      if (!amounts.has(card.id) && card.percentage !== null && card.source_card_id) {
        const base = amounts.get(card.source_card_id) ?? 0
        amounts.set(card.id, (base * card.percentage) / 100)
      }
    }
    return amounts
  })()

  const groupsWithItems = fixedGroups.map(g => ({
    group: g,
    items: fixedItems.filter(i => i.group_id === g.id),
  }))

  function goMonth(delta: number) {
    let m = month + delta
    let y = year
    if (m < 1) { m = 12; y-- }
    if (m > 12) { m = 1; y++ }
    router.push(`/shared/${sharedAccess.token}?month=${m}&year=${y}`)
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F5F7', fontFamily: 'var(--font-sans, system-ui)' }}>
      {/* Hero */}
      <div className="relative overflow-hidden px-5 pt-10 pb-20"
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

      <div className="relative -mt-12 px-4 pb-24 space-y-4">
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

        {/* Tabla de distribución (solo lectura) */}
        {budgetCards.length > 0 && (
          <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-border/60"
              style={{ background: 'linear-gradient(90deg, #3BB2F610 0%, transparent 60%)' }}>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Distribución</p>
            </div>
            <div className="divide-y divide-border/50">
              {budgetCards.map(card => {
                const amount = cardAmounts.get(card.id) ?? 0
                return (
                  <div key={card.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {(card.sum_category as any)?.icon && (
                        <span className="text-sm flex-shrink-0">{(card.sum_category as any).icon}</span>
                      )}
                      <span className="text-sm font-medium text-foreground truncate">{card.name}</span>
                      {card.percentage !== null && (
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">{card.percentage}%</span>
                      )}
                    </div>
                    <span className="text-sm font-bold tabular-nums flex-shrink-0 ml-2">{formatCurrency(amount)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Gastos fijos (solo lectura) */}
        {groupsWithItems.map(({ group, items }) => (
          <div key={group.id} className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-border/60"
              style={{ borderLeft: `3px solid ${group.color}`, background: `linear-gradient(90deg, ${group.color}10 0%, transparent 60%)` }}>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{group.name}</p>
            </div>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground px-4 py-3">Sin gastos este mes</p>
            ) : (
              <div className="divide-y divide-border/50">
                {items.map(item => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-sm flex-shrink-0">{(item.category as any)?.icon ?? '📌'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.description}</p>
                      {item.category && <p className="text-xs text-muted-foreground">{(item.category as any).name}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-bold tabular-nums">{formatCurrency(item.amount)}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={item.status === 'paid'
                          ? { background: '#00CB9620', color: '#00CB96' }
                          : { background: '#FF4D6D18', color: '#FF4D6D' }
                        }>
                        {item.status === 'paid' ? 'Pagado' : 'Pendiente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Link a transacciones */}
        <Link
          href={`/shared/${sharedAccess.token}/transacciones?month=${month}&year=${year}`}
          className="flex items-center justify-between p-4 bg-white rounded-2xl border border-border shadow-sm hover:bg-muted/30 transition-colors"
        >
          <div>
            <p className="text-sm font-semibold text-foreground">Ver transacciones</p>
            <p className="text-xs text-muted-foreground mt-0.5">Todos los movimientos del mes</p>
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>
    </div>
  )
}
