'use client'

import { formatCurrency } from '@/lib/utils'

interface Props {
  totalFixed: number
  totalVariable: number
  totalIncome: number
}

const FIXED_COLOR    = '#7C4DFF'
const VARIABLE_COLOR = '#F59E0B'
const TOTAL_COLOR    = '#FF4D6D'

function pctOf(amount: number, income: number): string | null {
  if (!income || !amount) return null
  return ((amount / income) * 100).toFixed(1)
}

export function ExpenseTotalsSummary({ totalFixed, totalVariable, totalIncome }: Props) {
  const total = totalFixed + totalVariable
  if (total === 0) return null

  const rows = [
    totalFixed    > 0 && { label: 'Gastos fijos',     amount: totalFixed,    color: FIXED_COLOR },
    totalVariable > 0 && { label: 'Gastos variables',  amount: totalVariable, color: VARIABLE_COLOR },
  ].filter(Boolean) as { label: string; amount: number; color: string }[]

  const totalPct = pctOf(total, totalIncome)

  return (
    <div className="space-y-4 max-w-2xl mx-auto mt-8">
      <div>
        <h2 className="text-xl font-bold text-foreground">Total gastos del mes</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Suma de gastos fijos y variables</p>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <div className="grid grid-cols-[1fr_56px_120px] bg-muted/40 border-b border-border px-4 py-2.5">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Tipo</span>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-center">%</span>
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-right">Monto</span>
        </div>

        {rows.map(({ label, amount, color }) => {
          const pct = pctOf(amount, totalIncome)
          return (
            <div key={label} className="grid grid-cols-[1fr_56px_120px] items-center px-4 py-3 border-b border-border">
              <span className="text-sm font-medium text-foreground">{label}</span>
              <div className="flex justify-center">
                {pct !== null ? (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ color, backgroundColor: color + '18' }}
                  >
                    {pct}%
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground/40">—</span>
                )}
              </div>
              <div className="text-right">
                <span className="text-sm font-semibold tabular-nums" style={{ color }}>
                  {formatCurrency(amount)}
                </span>
              </div>
            </div>
          )
        })}

        <div
          className="grid grid-cols-[1fr_56px_120px] items-center px-4 py-2.5"
          style={{ backgroundColor: TOTAL_COLOR + '10' }}
        >
          <span className="text-xs font-bold" style={{ color: TOTAL_COLOR }}>Total gastos</span>
          <span className="text-center text-[10px] font-bold" style={{ color: TOTAL_COLOR }}>
            {totalPct !== null ? `${totalPct}%` : '—'}
          </span>
          <span className="text-right text-sm font-bold tabular-nums" style={{ color: TOTAL_COLOR }}>
            {formatCurrency(total)}
          </span>
        </div>
      </div>
    </div>
  )
}
