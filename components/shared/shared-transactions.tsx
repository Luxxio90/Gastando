'use client'

import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { Account } from '@/types'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
}

interface Props {
  token: string
  transactions: any[]
  accounts: Account[]
  month: number
  year: number
}

export function SharedTransactions({ token, transactions, accounts, month, year }: Props) {
  const router = useRouter()

  function goMonth(delta: number) {
    let m = month + delta, y = year
    if (m < 1) { m = 12; y-- }
    if (m > 12) { m = 1; y++ }
    router.push(`/shared/${token}/transacciones?month=${m}&year=${y}`)
  }

  // Agrupar por fecha
  const groups: Record<string, any[]> = {}
  for (const t of transactions) {
    if (!groups[t.date]) groups[t.date] = []
    groups[t.date].push(t)
  }
  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a))

  const totalIncome  = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#F5F5F7' }}>
      {/* Hero */}
      <div className="relative overflow-hidden px-5 pt-8 pb-12"
        style={{ background: 'linear-gradient(135deg, #00C9A7 0%, #00B4D8 100%)' }}>
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
        <div className="relative">
          <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">Transacciones</p>
          <div className="flex items-center gap-3 mt-2">
            <button onClick={() => goMonth(-1)} className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
              <ChevronLeft className="h-4 w-4 text-white" />
            </button>
            <span className="text-white font-semibold text-sm min-w-[130px] text-center">{MONTHS[month - 1]} {year}</span>
            <button onClick={() => goMonth(1)} className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
              <ChevronRight className="h-4 w-4 text-white" />
            </button>
          </div>
          {/* Resumen */}
          <div className="flex gap-5 mt-4 pt-4 border-t border-white/20">
            <div>
              <p className="text-[10px] font-semibold text-white/60 uppercase tracking-wide">Ingresos</p>
              <p className="font-bold text-sm tabular-nums mt-0.5 text-white">+{formatCurrency(totalIncome)}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-white/60 uppercase tracking-wide">Gastos</p>
              <p className="font-bold text-sm tabular-nums mt-0.5 text-white">-{formatCurrency(totalExpense)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-3 space-y-3">
        {sortedDates.length === 0 ? (
          <div className="bg-white rounded-2xl border border-border p-8 text-center shadow-sm">
            <p className="text-sm text-muted-foreground">Sin transacciones este mes</p>
          </div>
        ) : sortedDates.map(date => (
          <div key={date}>
            {/* Header de fecha sticky */}
            <div className="sticky top-0 z-10 py-2">
              <span className="text-[11px] font-semibold text-muted-foreground capitalize px-1">
                {formatDate(date)}
              </span>
            </div>
            {/* Transacciones del día */}
            <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm divide-y divide-border/50">
              {groups[date].map((t: any) => {
                const isIncome = t.type === 'income'
                const isTransfer = t.type === 'transfer'
                const color = isIncome ? '#00CB96' : isTransfer ? '#3BB2F6' : '#FF4D6D'
                return (
                  <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-xl flex-shrink-0">{t.category?.icon ?? (isTransfer ? '↔️' : '💸')}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {t.description || t.category?.name || '—'}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {t.account && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                            style={{ background: t.account.color + '20', color: t.account.color }}>
                            {t.account.name}
                          </span>
                        )}
                        {t.responsible && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                            style={{ background: t.responsible.color + '20', color: t.responsible.color }}>
                            {t.responsible.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-bold tabular-nums flex-shrink-0" style={{ color }}>
                      {isIncome ? '+' : isTransfer ? '' : '-'}{formatCurrency(t.amount, t.account?.currency)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
