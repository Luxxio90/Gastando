import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BudgetCardsView } from '@/components/budgets/budget-cards-view'
import { BudgetCard } from '@/types'

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const params = await searchParams
  const now = new Date()
  const month = parseInt(params.month ?? String(now.getMonth() + 1))
  const year = parseInt(params.year ?? String(now.getFullYear()))

  const firstDay = new Date(year, month - 1, 1).toISOString()
  const lastDay = new Date(year, month, 0).toISOString()

  const [{ data: cards }, { data: categories }, { data: transactions }] = await Promise.all([
    supabase
      .from('budget_cards')
      .select('*, sum_category:categories!sum_category_id(id,name,icon,type), track_category:categories!track_category_id(id,name,icon,type)')
      .eq('user_id', user.id)
      .eq('month', month)
      .eq('year', year)
      .order('created_at'),
    supabase
      .from('categories')
      .select('*')
      .or(`user_id.eq.${user.id},is_default.eq.true`)
      .order('type')
      .order('name'),
    supabase
      .from('transactions')
      .select('category_id, amount, type')
      .eq('user_id', user.id)
      .gte('date', firstDay)
      .lte('date', lastDay),
  ])

  const allCards = (cards ?? []) as BudgetCard[]
  const allTransactions = transactions ?? []

  const incomeByCat: Record<string, number> = {}
  const expenseByCat: Record<string, number> = {}
  for (const t of allTransactions) {
    if (t.type === 'income') incomeByCat[t.category_id] = (incomeByCat[t.category_id] ?? 0) + t.amount
    else expenseByCat[t.category_id] = (expenseByCat[t.category_id] ?? 0) + t.amount
  }

  // Resolve each card's amount
  const resolvedAmounts: Record<string, number> = {}
  for (const card of allCards) {
    if (card.calc_type === 'manual') {
      resolvedAmounts[card.id] = card.manual_amount ?? 0
    } else if (card.calc_type === 'category_sum') {
      const cat = card.sum_category_id ?? ''
      resolvedAmounts[card.id] = card.card_type === 'income'
        ? (incomeByCat[cat] ?? 0)
        : (expenseByCat[cat] ?? 0)
    } else if (card.calc_type === 'percentage' && card.source_card_id) {
      const base = resolvedAmounts[card.source_card_id] ?? 0
      resolvedAmounts[card.id] = base * (card.percentage ?? 0) / 100
    }
  }

  return (
    <div className="p-6">
      <BudgetCardsView
        cards={allCards}
        categories={categories ?? []}
        resolvedAmounts={resolvedAmounts}
        incomeByCat={incomeByCat}
        expenseByCat={expenseByCat}
        userId={user.id}
        month={month}
        year={year}
      />
    </div>
  )
}
