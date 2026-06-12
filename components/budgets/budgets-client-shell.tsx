'use client'

import { useState } from 'react'
import { VariableSection } from './variable-section'
import { FixedExpensesTable } from './fixed-expenses-table'
import type { Account, FixedExpenseGroup, FixedExpenseItem, Responsible, Category } from '@/types'

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
  totalIncome: number
  groups: FixedExpenseGroup[]
  items: FixedExpenseItem[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fixedCategories: any[]
  userId: string
  month: number
  year: number
}

export function BudgetsClientShell({
  transactions, categories, accounts, responsibles, totalIncome,
  groups, items, fixedCategories, userId, month, year,
}: Props) {
  const [excludedGroupIds, setExcludedGroupIds] = useState<string[]>([])

  function toggleGroupExclusion(id: string) {
    setExcludedGroupIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const totalFixed = items
    .filter(i => i.group_id == null || !excludedGroupIds.includes(i.group_id))
    .reduce((s, i) => s + (i.amount ?? 0), 0)

  return (
    <>
      <VariableSection
        transactions={transactions}
        categories={categories}
        accounts={accounts}
        responsibles={responsibles}
        totalFixed={totalFixed}
        totalIncome={totalIncome}
      />
      <FixedExpensesTable
        key={`${month}-${year}`}
        groups={groups}
        items={items}
        fixedCategories={fixedCategories}
        responsibles={responsibles}
        accounts={accounts as any[]}
        userId={userId}
        month={month}
        year={year}
        excludedGroupIds={excludedGroupIds}
        onToggleGroupExclusion={toggleGroupExclusion}
      />
    </>
  )
}
