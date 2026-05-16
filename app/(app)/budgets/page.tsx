import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BudgetsList } from '@/components/budgets/budgets-list'

export default async function BudgetsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const firstDay = new Date(year, month - 1, 1).toISOString()
  const lastDay = new Date(year, month, 0).toISOString()

  const [{ data: budgets }, { data: categories }, { data: transactions }] = await Promise.all([
    supabase.from('budgets').select('*, category:categories(*)').eq('user_id', user.id).eq('month', month).eq('year', year),
    supabase.from('categories').select('*').or(`user_id.eq.${user.id},is_default.eq.true`).eq('type', 'expense').order('name'),
    supabase.from('transactions').select('category_id, amount').eq('user_id', user.id).eq('type', 'expense').gte('date', firstDay).lte('date', lastDay),
  ])

  const spentByCategory = (transactions ?? []).reduce<Record<string, number>>((acc, t) => {
    acc[t.category_id] = (acc[t.category_id] ?? 0) + t.amount
    return acc
  }, {})

  const budgetsWithSpent = (budgets ?? []).map(b => ({ ...b, spent: spentByCategory[b.category_id] ?? 0 }))

  return (
    <div className="p-6">
      <BudgetsList budgets={budgetsWithSpent} categories={categories ?? []} userId={user.id} month={month} year={year} />
    </div>
  )
}
