'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
  PieChart, Pie, Cell, Label,
} from 'recharts'
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Wallet, PiggyBank, X } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

const MONTH_NAMES_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const MONTH_NAMES_LONG  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

type RawTx = { type: 'income' | 'expense'; amount: number; date: string; account_id: string }
type RawTxCat = {
  type: 'income' | 'expense'
  amount: number
  account_id: string
  description?: string | null
  date?: string | null
  category?: { name: string; icon: string; color: string } | null
}
type RawAccount = { id: string; name: string; color: string; type?: string }

interface Props {
  month: number
  year: number
  transactions: RawTxCat[]
  trendTransactions: RawTx[]
  accounts: RawAccount[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getLast6Months(month: number, year: number) {
  return Array.from({ length: 6 }, (_, i) => {
    let m = month - (5 - i)
    let y = year
    while (m <= 0) { m += 12; y-- }
    return { month: m, year: y }
  })
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 shadow-lg text-xs space-y-1">
      <p className="font-bold text-foreground mb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.fill }} />
          <span className="text-muted-foreground">{p.name === 'income' ? 'Ingresos' : 'Gastos'}:</span>
          <span className="font-semibold text-foreground">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────

export function EstadisticasView({ month, year, transactions, trendTransactions, accounts }: Props) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string> | null>(null) // null = todas
  const [selectedCat, setSelectedCat] = useState<string | null>(null)

  function navigate(dir: -1 | 1) {
    let m = month + dir, y = year
    if (m < 1) { m = 12; y-- }
    if (m > 12) { m = 1; y++ }
    setSelectedCat(null)
    router.push(`/estadisticas?month=${m}&year=${y}`)
  }

  function toggleAccount(id: string) {
    setSelectedIds(prev => {
      if (prev === null) return new Set([id])
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        return next.size === 0 ? null : next
      }
      next.add(id)
      return next.size === accounts.length ? null : next
    })
  }

  function selectAll() { setSelectedIds(null) }

  function toggleCat(name: string) {
    setSelectedCat(prev => prev === name ? null : name)
  }

  // ── Filter transactions by selected accounts ───────────────────────────────
  const filteredTx    = selectedIds === null ? transactions      : transactions.filter(t => selectedIds.has(t.account_id))
  const filteredTrend = selectedIds === null ? trendTransactions : trendTransactions.filter(t => selectedIds.has(t.account_id))

  // ── Summary ────────────────────────────────────────────────────────────────
  const income     = filteredTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense    = filteredTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const balance    = income - expense
  const savingsPct = income > 0 ? Math.round((balance / income) * 100) : 0

  // ── Category breakdown ────────────────────────────────────────────────────
  const catMap: Record<string, { name: string; icon: string; color: string; value: number }> = {}
  for (const t of filteredTx.filter(t => t.type === 'expense')) {
    const key   = t.category?.name  ?? 'Sin categoría'
    const icon  = t.category?.icon  ?? '📋'
    const color = t.category?.color ?? '#7C4DFF'
    if (!catMap[key]) catMap[key] = { name: key, icon, color, value: 0 }
    catMap[key].value += t.amount
  }
  const catData = Object.values(catMap).sort((a, b) => b.value - a.value)

  // ── Category drill-down ───────────────────────────────────────────────────
  const catTxs = selectedCat
    ? filteredTx
        .filter(t => t.type === 'expense' && (t.category?.name ?? 'Sin categoría') === selectedCat)
        .sort((a, b) => new Date(b.date ?? '').getTime() - new Date(a.date ?? '').getTime())
    : []
  const catDetail = selectedCat ? catMap[selectedCat] : null

  // ── 6-month trend ─────────────────────────────────────────────────────────
  const periods = getLast6Months(month, year)
  const trendData = periods.map(({ month: m, year: y }) => {
    const txs = filteredTrend.filter(t => {
      const d = new Date(t.date)
      return d.getFullYear() === y && d.getMonth() + 1 === m
    })
    return {
      name:    MONTH_NAMES_SHORT[m - 1],
      income:  txs.filter(t => t.type === 'income').reduce((s, t)  => s + t.amount, 0),
      expense: txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    }
  })

  const summaryCards = [
    { label: 'Ingresos', value: income,  color: '#00CB96', Icon: TrendingUp },
    { label: 'Gastos',   value: expense,  color: '#FF4D6D', Icon: TrendingDown },
    { label: 'Balance',  value: balance,  color: '#3BB2F6', Icon: Wallet },
    { label: 'Ahorro',   value: null,     color: '#7C4DFF', Icon: PiggyBank, pct: savingsPct },
  ]

  return (
    <div className="space-y-4">

      {/* ── Filtros ──────────────────────────────────────────────────────────── */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">

        {/* Month selector */}
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Período</p>
          <div className="flex items-center justify-between bg-muted/40 rounded-xl px-2 py-1.5">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-semibold text-sm text-foreground capitalize">
              {MONTH_NAMES_LONG[month - 1]} {year}
            </span>
            <button
              onClick={() => navigate(1)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Account filter */}
        {accounts.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Cuentas</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={selectAll}
                className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                style={selectedIds === null
                  ? { background: '#7C4DFF20', borderColor: '#7C4DFF60', color: '#7C4DFF' }
                  : { background: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }
                }
              >
                Todas
              </button>

              {accounts.map(acc => {
                const active = selectedIds !== null && selectedIds.has(acc.id)
                const color  = acc.color || '#7C4DFF'
                return (
                  <button
                    key={acc.id}
                    onClick={() => toggleAccount(acc.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                    style={active
                      ? { background: color + '20', borderColor: color + '60', color }
                      : { background: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }
                    }
                  >
                    <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: active ? color : 'hsl(var(--muted-foreground))' }} />
                    {acc.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Summary cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {summaryCards.map(({ label, value, color, Icon, pct }) => (
          <div
            key={label}
            className="bg-card rounded-xl border border-border p-4"
            style={{ borderLeft: `3px solid ${color}` }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</span>
              <div className="h-6 w-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '20' }}>
                <Icon className="h-3.5 w-3.5" style={{ color }} />
              </div>
            </div>
            {pct !== undefined ? (
              <p className="text-2xl font-bold" style={{ color: pct >= 0 ? color : '#FF4D6D' }}>
                {pct}%
              </p>
            ) : (
              <p className="text-lg font-bold tabular-nums" style={{ color: (value ?? 0) < 0 ? '#FF4D6D' : 'hsl(var(--foreground))' }}>
                {formatCurrency(value!)}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* ── Expense by category ───────────────────────────────────────────────── */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border/60"
          style={{ background: 'linear-gradient(90deg, #FF4D6D10 0%, transparent 60%)' }}>
          <p className="font-bold text-sm text-foreground">Gastos por categoría</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{MONTH_NAMES_LONG[month - 1]} {year} · toca una categoría para ver detalle</p>
        </div>

        {catData.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Sin gastos en el período seleccionado</div>
        ) : (
          <div className="p-4 space-y-4">
            {/* Donut */}
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-[130px] h-[130px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={catData}
                      cx="50%" cy="50%"
                      innerRadius={42} outerRadius={60}
                      dataKey="value"
                      strokeWidth={0}
                      onClick={(entry) => entry.name && toggleCat(entry.name as string)}
                      style={{ cursor: 'pointer' }}
                    >
                      {catData.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry.color}
                          opacity={selectedCat === null || selectedCat === entry.name ? 1 : 0.35}
                        />
                      ))}
                      <Label
                        content={({ viewBox }) => {
                          const vb = viewBox as { cx?: number; cy?: number }
                          if (!vb.cx || !vb.cy) return null
                          return (
                            <g>
                              <text x={vb.cx} y={vb.cy - 6} textAnchor="middle"
                                fill="#FF4D6D" fontSize={10} fontWeight="700">
                                {formatCurrency(expense)}
                              </text>
                              <text x={vb.cx} y={vb.cy + 8} textAnchor="middle"
                                fill="#6b7280" fontSize={9}>
                                Total
                              </text>
                            </g>
                          )
                        }}
                      />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Top 4 */}
              <div className="flex-1 space-y-2 min-w-0">
                {catData.slice(0, 4).map(cat => {
                  const pct    = expense > 0 ? Math.round((cat.value / expense) * 100) : 0
                  const active = selectedCat === cat.name
                  return (
                    <button
                      key={cat.name}
                      onClick={() => toggleCat(cat.name)}
                      className="flex items-center gap-2 w-full text-left rounded-lg px-1.5 py-0.5 transition-colors"
                      style={active ? { backgroundColor: cat.color + '15' } : {}}
                    >
                      <span className="text-sm leading-none flex-shrink-0">{cat.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] text-foreground font-medium truncate">{cat.name}</span>
                          <span className="text-[10px] font-bold flex-shrink-0" style={{ color: cat.color }}>{pct}%</span>
                        </div>
                        <div className="h-1 bg-muted/50 rounded-full mt-1 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Full list */}
            <div className="border-t border-border/50 pt-3 space-y-0.5">
              {catData.map(cat => {
                const pct    = expense > 0 ? Math.round((cat.value / expense) * 100) : 0
                const active = selectedCat === cat.name
                return (
                  <button
                    key={cat.name}
                    onClick={() => toggleCat(cat.name)}
                    className="flex items-center gap-3 py-2.5 px-2 rounded-xl transition-colors w-full text-left"
                    style={active ? { backgroundColor: cat.color + '15' } : {}}
                  >
                    <div
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                      style={{ backgroundColor: cat.color + '20' }}
                    >
                      {cat.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-foreground truncate">{cat.name}</span>
                        <span className="text-xs font-bold text-foreground tabular-nums flex-shrink-0">
                          {formatCurrency(cat.value)}
                        </span>
                      </div>
                      <div className="h-1 bg-muted/50 rounded-full mt-1.5 overflow-hidden">
                        <div className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                      </div>
                    </div>
                    <span
                      className="text-[10px] font-bold w-8 text-right flex-shrink-0"
                      style={{ color: cat.color }}
                    >
                      {pct}%
                    </span>
                  </button>
                )
              })}
            </div>

            {/* ── Category drill-down panel ──────────────────────────────────── */}
            {selectedCat && catDetail && (
              <div
                className="rounded-xl border overflow-hidden"
                style={{ borderColor: catDetail.color + '50', backgroundColor: catDetail.color + '08' }}
              >
                {/* Header */}
                <div
                  className="flex items-center justify-between px-4 py-3 border-b"
                  style={{ borderColor: catDetail.color + '30' }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{catDetail.icon}</span>
                    <div>
                      <p className="text-sm font-bold text-foreground">{catDetail.name}</p>
                      <p className="text-[10px] text-muted-foreground">{catTxs.length} transacciones</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold tabular-nums" style={{ color: catDetail.color }}>
                      {formatCurrency(catDetail.value)}
                    </span>
                    <button
                      onClick={() => setSelectedCat(null)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Transaction list */}
                <div className="divide-y" style={{ borderColor: catDetail.color + '20' }}>
                  {catTxs.map((t, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {t.description || 'Sin descripción'}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {t.date ? formatDate(t.date) : ''}
                        </p>
                      </div>
                      <span className="text-sm font-bold tabular-nums text-red-500 flex-shrink-0">
                        -{formatCurrency(t.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 6-month trend ────────────────────────────────────────────────────── */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border/60"
          style={{ background: 'linear-gradient(90deg, #3BB2F610 0%, transparent 60%)' }}>
          <p className="font-bold text-sm text-foreground">Últimos 6 meses</p>
          <div className="flex items-center gap-3 mt-1">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: '#00CB96' }} />
              <span className="text-[10px] text-muted-foreground">Ingresos</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: '#FF4D6D' }} />
              <span className="text-[10px] text-muted-foreground">Gastos</span>
            </div>
          </div>
        </div>

        <div className="p-4">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={trendData} barGap={3} barCategoryGap="30%">
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false} tickLine={false}
              />
              <YAxis hide />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} />
              <Bar dataKey="income"  fill="#00CB96" radius={[4, 4, 0, 0]} maxBarSize={24} />
              <Bar dataKey="expense" fill="#FF4D6D" radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  )
}
