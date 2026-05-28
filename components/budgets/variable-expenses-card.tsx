'use client'

import { Category } from '@/types'
import { formatCurrency } from '@/lib/utils'

interface Props {
  categories: Category[]
  variableExpenseByCat: Record<string, number>
  totalIncome: number
}

export function VariableExpensesCard({ categories, variableExpenseByCat, totalIncome }: Props) {
  const variableCats = categories.filter(c => c.type === 'expense')

  const rows = variableCats
    .map(c => ({ cat: c, amount: variableExpenseByCat[c.id] ?? 0 }))
    .filter(r => r.amount > 0)
    .sort((a, b) => b.amount - a.amount)

  const total = rows.reduce((s, r) => s + r.amount, 0)

  if (total === 0) return null

  const pctOfIncome = totalIncome > 0 ? (total / totalIncome) * 100 : null
  const VARIABLE_COLOR = '#F59E0B'

  return (
    <div className="space-y-4 max-w-2xl mx-auto mt-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Gastos variables</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Gastos del mes sin contar transferencias</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        {/* Header */}
        <div className="grid grid-cols-[1fr_56px_120px] bg-muted/40 border-b border-border px-4 py-2.5">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Categoría</span>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-center">%</span>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-right">Monto</span>
        </div>

        {rows.map(({ cat, amount }) => {
          const pct = total > 0 ? ((amount / total) * 100).toFixed(1) : null
          const barWidth = total > 0 ? (amount / total) * 100 : 0
          return (
            <div key={cat.id} className="border-b border-border last:border-b-0">
              <div className="grid grid-cols-[1fr_56px_120px] items-center px-4 py-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base leading-none flex-shrink-0">{cat.icon}</span>
                  <p className="text-sm font-medium text-foreground truncate">{cat.name}</p>
                </div>
                <div className="flex justify-center">
                  {pct !== null ? (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                      style={{ color: VARIABLE_COLOR, backgroundColor: VARIABLE_COLOR + '18' }}
                    >
                      {pct}%
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/40">—</span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold tabular-nums text-foreground">
                    {formatCurrency(amount)}
                  </span>
                </div>
              </div>
              {barWidth > 0 && (
                <div className="h-0.5 mx-4 bg-muted/40 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${barWidth}%`, backgroundColor: VARIABLE_COLOR + 'aa' }}
                  />
                </div>
              )}
            </div>
          )
        })}

        {/* Total */}
        <div
          className="grid grid-cols-[1fr_56px_120px] items-center px-4 py-2.5"
          style={{ backgroundColor: VARIABLE_COLOR + '10' }}
        >
          <span className="text-xs font-bold" style={{ color: VARIABLE_COLOR }}>Total variables</span>
          <span className="text-center text-[10px] font-bold" style={{ color: VARIABLE_COLOR }}>
            {pctOfIncome !== null ? `${pctOfIncome.toFixed(1)}%` : '—'}
          </span>
          <span className="text-right text-sm font-bold tabular-nums" style={{ color: VARIABLE_COLOR }}>
            {formatCurrency(total)}
          </span>
        </div>
      </div>
    </div>
  )
}
