'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency } from '@/lib/utils'
import type { CreditCard as CC, CreditCardMonth } from '@/types'

const CHART_COLORS = ['#3b82f6', '#f97316', '#10b981', '#a78bfa', '#ef4444', '#eab308', '#06b6d4', '#ec4899']
const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

interface Props {
  cards: CC[]
  historyMonths: CreditCardMonth[]
  historyItems: { card_month_id: string; amount: number }[]
  month: number
  year: number
}

export function CreditCardChart({ cards, historyMonths, historyItems, month, year }: Props) {
  if (cards.length === 0) return null

  const periods = Array.from({ length: 6 }, (_, i) => {
    let m = month - (5 - i)
    let y = year
    while (m <= 0) { m += 12; y-- }
    return { month: m, year: y, label: `${MONTHS_SHORT[m - 1]} '${String(y).slice(2)}` }
  })

  const totalsMap: Record<string, number> = {}
  for (const item of historyItems) {
    totalsMap[item.card_month_id] = (totalsMap[item.card_month_id] ?? 0) + item.amount
  }

  const data = periods.map(period => {
    const point: Record<string, number | string> = { label: period.label }
    for (const card of cards) {
      const cm = historyMonths.find(m => m.card_id === card.id && m.month === period.month && m.year === period.year)
      point[card.id] = cm ? (totalsMap[cm.id] ?? 0) : 0
    }
    return point
  })

  const currentValues = cards.map((card, i) => {
    const cm = historyMonths.find(m => m.card_id === card.id && m.month === month && m.year === year)
    return {
      card,
      color: CHART_COLORS[i % CHART_COLORS.length],
      value: cm ? (totalsMap[cm.id] ?? 0) : 0,
    }
  })

  return (
    <div className="bg-card rounded-2xl border border-border p-4 space-y-4">
      <p className="text-sm font-semibold text-foreground">Evolución mensual</p>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v =>
              v === 0 ? '' :
              v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` :
              v >= 1000 ? `$${(v / 1000).toFixed(0)}k` :
              `$${v}`
            }
            width={38}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 12,
              fontSize: 12,
              padding: '8px 12px',
            }}
            labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600, marginBottom: 4 }}
            formatter={(value: unknown, name: unknown) => {
              const card = cards.find(c => c.id === String(name))
              return [formatCurrency(Number(value)), card?.name ?? String(name)]
            }}
          />
          {cards.map((card, i) => (
            <Line
              key={card.id}
              type="monotone"
              dataKey={card.id}
              stroke={CHART_COLORS[i % CHART_COLORS.length]}
              strokeWidth={2.5}
              dot={{ r: 3, fill: CHART_COLORS[i % CHART_COLORS.length], strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      <div className="flex flex-wrap gap-x-5 gap-y-2.5">
        {currentValues.map(({ card, color, value }) => (
          <div key={card.id} className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="text-xs text-muted-foreground">{card.name}</span>
            <span className="text-xs font-bold" style={{ color }}>{formatCurrency(value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
