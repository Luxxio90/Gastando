import { formatCurrency } from '@/lib/utils'
import { TrendingDown, TrendingUp } from 'lucide-react'

interface Props {
  monthIncome: number
  monthExpenses: number
  fixedTotal: number
  fixedPaid: number
}

const TEAL   = '#00C9A7'
const VIOLET = '#7C4DFF'
const RED    = '#FF4D6D'
const AMBER  = '#F59E0B'

export function BudgetProgressCard({ monthIncome, monthExpenses, fixedTotal, fixedPaid }: Props) {
  if (monthIncome === 0 && monthExpenses === 0) return null

  const pctUsed      = monthIncome > 0 ? Math.min(100, (monthExpenses / monthIncome) * 100) : 0
  const disponible   = monthIncome - monthExpenses
  const overBudget   = disponible < 0
  const variableExp  = Math.max(0, monthExpenses - fixedPaid)

  const barColor = pctUsed >= 100 ? RED : pctUsed >= 80 ? AMBER : TEAL

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
      {/* Progress bar top */}
      <div className="h-1.5 bg-muted/40">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pctUsed}%`, backgroundColor: barColor }}
        />
      </div>

      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Progreso del mes</p>
            <p
              className="text-2xl font-bold mt-1 tabular-nums"
              style={{ color: overBudget ? RED : TEAL }}
            >
              {overBudget ? '-' : ''}{formatCurrency(Math.abs(disponible))}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {overBudget ? 'te pasaste del ingreso' : 'disponible este mes'}
            </p>
          </div>
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: overBudget ? RED + '15' : TEAL + '15' }}
          >
            {overBudget
              ? <TrendingDown className="h-5 w-5" style={{ color: RED }} />
              : <TrendingUp   className="h-5 w-5" style={{ color: TEAL }} />
            }
          </div>
        </div>

        {/* Progress label */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            <span className="font-bold tabular-nums" style={{ color: barColor }}>
              {pctUsed.toFixed(0)}%
            </span>
            {' '}utilizado
          </span>
          <span className="tabular-nums">
            {formatCurrency(monthExpenses)} de {formatCurrency(monthIncome)}
          </span>
        </div>

        {/* Breakdown chips */}
        {(fixedTotal > 0 || variableExp > 0) && (
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
            {fixedTotal > 0 && (
              <div
                className="rounded-xl px-3 py-2.5"
                style={{ backgroundColor: VIOLET + '10' }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: VIOLET }}>
                  Fijos
                </p>
                <p className="text-sm font-bold tabular-nums mt-0.5" style={{ color: VIOLET }}>
                  {formatCurrency(fixedPaid)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  de {formatCurrency(fixedTotal)} presupuestados
                </p>
              </div>
            )}
            {variableExp > 0 && (
              <div
                className="rounded-xl px-3 py-2.5"
                style={{ backgroundColor: AMBER + '10' }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: AMBER }}>
                  Variables
                </p>
                <p className="text-sm font-bold tabular-nums mt-0.5" style={{ color: AMBER }}>
                  {formatCurrency(variableExp)}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {monthIncome > 0 ? `${((variableExp / monthIncome) * 100).toFixed(0)}% del ingreso` : '—'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
