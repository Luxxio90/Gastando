'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from 'recharts'
import { Transaction } from '@/types'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

const COLORS = ['#7C4DFF', '#3BB2F6', '#00CB96', '#F59E0B', '#FF4D6D', '#EC4899', '#14B8A6', '#F97316']

export function ExpenseChart({ transactions }: { transactions: Transaction[] }) {
  const expenses = transactions.filter(t => t.type === 'expense')
  const total = expenses.reduce((s, t) => s + t.amount, 0)

  const byCategory = expenses.reduce<Record<string, { value: number; color?: string }>>((acc, t) => {
    const name = t.category?.name ?? 'Sin categoría'
    if (!acc[name]) acc[name] = { value: 0, color: t.category?.color ?? undefined }
    acc[name].value += t.amount
    return acc
  }, {})

  const data = Object.entries(byCategory)
    .map(([name, { value, color }]) => ({ name, value, color }))
    .sort((a, b) => b.value - a.value)

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Distribución de gastos</CardTitle>
          <Link href="/transactions" className="text-xs text-primary hover:underline">Ver detalle</Link>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-36 text-muted-foreground text-sm">
          No hay gastos este mes
        </CardContent>
      </Card>
    )
  }

  const totalLabel = formatCurrency(total)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Distribución de gastos</CardTitle>
        <Link href="/transactions" className="text-xs text-primary hover:underline">Ver detalle</Link>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 w-[150px] h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={70}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {data.map((entry, i) => (
                    <Cell key={i} fill={entry.color || COLORS[i % COLORS.length]} />
                  ))}
                  <Label
                    content={({ viewBox }) => {
                      const vb = viewBox as { cx?: number; cy?: number }
                      if (!vb.cx || !vb.cy) return null
                      return (
                        <g>
                          <text
                            x={vb.cx}
                            y={vb.cy - 7}
                            textAnchor="middle"
                            fill="white"
                            fontSize={11}
                            fontWeight="700"
                          >
                            {totalLabel}
                          </text>
                          <text
                            x={vb.cx}
                            y={vb.cy + 9}
                            textAnchor="middle"
                            fill="#6b7280"
                            fontSize={10}
                          >
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

          <div className="flex-1 space-y-2 min-w-0">
            {data.slice(0, 5).map((entry, i) => {
              const pct = ((entry.value / total) * 100).toFixed(1)
              const color = entry.color || COLORS[i % COLORS.length]
              return (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-xs text-muted-foreground truncate">{entry.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-foreground/80 flex-shrink-0">{pct}%</span>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
