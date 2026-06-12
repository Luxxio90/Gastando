'use client'

import { useState, useMemo } from 'react'
import { Account, Category, Responsible } from '@/types'
import { VariableExpensesCard } from './variable-expenses-card'
import { ExpenseTotalsSummary } from './expense-totals-summary'

interface TxRow {
  category_id: string
  amount: number
  type: string
  account_id: string
  transfer_group_id: string | null
  responsible_party_id: string | null
}

interface Props {
  transactions: TxRow[]
  categories: Category[]
  accounts: Account[]
  responsibles: Responsible[]
  totalFixed: number
  totalIncome: number
}

export function VariableSection({ transactions, categories, accounts, responsibles, totalFixed, totalIncome }: Props) {
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([])
  const [selectedResponsibleId, setSelectedResponsibleId] = useState<string | null>(null)

  const toggleAccount = (id: string) =>
    setSelectedAccountIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const filtered = useMemo(() => {
    let txs = transactions
    if (selectedAccountIds.length > 0)
      txs = txs.filter(t => selectedAccountIds.includes(t.account_id))
    if (selectedResponsibleId)
      txs = txs.filter(t => t.responsible_party_id === selectedResponsibleId)
    return txs
  }, [transactions, selectedAccountIds, selectedResponsibleId])

  const variableCatIds = useMemo(
    () => new Set(categories.filter(c => c.type === 'expense' && c.expense_type?.name !== 'Gasto fijo').map(c => c.id)),
    [categories]
  )

  const variableExpenseByCat = useMemo(() => {
    const map: Record<string, number> = {}
    for (const t of filtered) {
      if (t.type === 'expense' && !t.transfer_group_id && variableCatIds.has(t.category_id)) {
        map[t.category_id] = (map[t.category_id] ?? 0) + t.amount
      }
    }
    return map
  }, [filtered, variableCatIds])

  const totalVariable = Object.values(variableExpenseByCat).reduce((s, v) => s + v, 0)
  const hasAccountFilter = accounts.length > 1

  return (
    <>
      {hasAccountFilter && (
        <div className="flex flex-wrap items-center gap-2 max-w-2xl mx-auto">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest w-full">
            Filtrar por cuenta
          </span>
          {accounts.map(acc => {
            const active = selectedAccountIds.includes(acc.id)
            return (
              <button
                key={acc.id}
                type="button"
                onClick={() => toggleAccount(acc.id)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors"
                style={active ? { backgroundColor: acc.color, borderColor: acc.color, color: 'white' } : {}}
              >
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: active ? 'white' : acc.color }} />
                {acc.name}
              </button>
            )
          })}
          {selectedAccountIds.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedAccountIds([])}
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
        responsibles={responsibles}
        selectedResponsibleId={selectedResponsibleId}
        onSelectResponsible={setSelectedResponsibleId}
      />

      <ExpenseTotalsSummary
        totalFixed={totalFixed}
        totalVariable={totalVariable}
        totalIncome={totalIncome}
      />
    </>
  )
}
