'use client'

import { useState, useMemo } from 'react'
import { Account, Category } from '@/types'
import { VariableExpensesCard } from './variable-expenses-card'
import { ExpenseTotalsSummary } from './expense-totals-summary'

interface TxRow {
  category_id: string
  amount: number
  type: string
  account_id: string
  transfer_group_id: string | null
}

interface Props {
  transactions: TxRow[]
  categories: Category[]
  accounts: Account[]
  totalFixed: number
  totalIncome: number
}

export function VariableSection({ transactions, categories, accounts, totalFixed, totalIncome }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const toggle = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const filtered = useMemo(
    () => selectedIds.length === 0 ? transactions : transactions.filter(t => selectedIds.includes(t.account_id)),
    [transactions, selectedIds]
  )

  const variableExpenseByCat = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of filtered) {
      if (t.type === 'expense' && !t.transfer_group_id) {
        map[t.category_id] = (map[t.category_id] ?? 0) + t.amount
      }
    }
    return map
  }, [filtered])

  const totalVariable = Object.values(variableExpenseByCat).reduce((s, v) => s + v, 0)

  const hasFilter = accounts.length > 1

  return (
    <>
      {hasFilter && (
        <div className="flex flex-wrap items-center gap-2 max-w-2xl mx-auto">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest w-full">
            Filtrar por cuenta
          </span>
          {accounts.map(acc => {
            const active = selectedIds.includes(acc.id)
            return (
              <button
                key={acc.id}
                type="button"
                onClick={() => toggle(acc.id)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors"
                style={active
                  ? { backgroundColor: acc.color, borderColor: acc.color, color: 'white' }
                  : {}
                }
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: active ? 'white' : acc.color }}
                />
                {acc.name}
              </button>
            )
          })}
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="px-3 py-1 rounded-full text-xs font-medium text-muted-foreground border border-dashed border-border hover:text-foreground transition-colors"
            >
              Ver todas
            </button>
          )}
        </div>
      )}

      <VariableExpensesCard
        categories={categories}
        variableExpenseByCat={variableExpenseByCat}
        totalIncome={totalIncome}
      />

      <ExpenseTotalsSummary
        totalFixed={totalFixed}
        totalVariable={totalVariable}
        totalIncome={totalIncome}
      />
    </>
  )
}
