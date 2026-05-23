import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ExpenseChart } from '@/components/dashboard/expense-chart'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import { DashboardCards } from '@/components/dashboard/dashboard-cards'
import { MonthNav } from '@/components/dashboard/month-nav'
import { ErrorState } from '@/components/ui/error-state'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const params   = await searchParams
  const now      = new Date()
  const month    = parseInt(params.month ?? String(now.getMonth() + 1))
  const year     = parseInt(params.year  ?? String(now.getFullYear()))

  const firstDay = new Date(year, month - 1, 1).toISOString()
  const lastDay  = new Date(year, month, 0, 23, 59, 59).toISOString()

  const [
    { data: transactions, error: txError },
    { data: accounts, error: accError },
    { data: investments },
    { data: budgetCards },
    { data: fixedItems },
  ] = await Promise.all([
    supabase
      .from('transactions')
      .select('*, category:categories(*), account:accounts(*)')
      .eq('user_id', user.id)
      .gte('date', firstDay)
      .lte('date', lastDay)
      .order('date', { ascending: false }),
    supabase.from('accounts').select('*').eq('user_id', user.id),
    supabase.from('investments').select('*').eq('user_id', user.id),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('budget_cards').select('id').eq('user_id', user.id).limit(1),
    supabase.from('fixed_expense_items').select('id').eq('user_id', user.id).limit(1),
  ])

  if (txError || accError) return <ErrorState title="Error al cargar el dashboard" />

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <MonthNav month={month} year={year} />
      </div>

      <DashboardCards
        accounts={accounts}
        transactions={transactions}
        investments={investments ?? []}
        userId={user.id}
        onboarding={{
          hasAccounts:     (accounts?.length ?? 0) > 0,
          hasIncome:       (transactions ?? []).some(t => t.type === 'income'),
          hasBudgetCards:  (budgetCards?.length ?? 0) > 0,
          hasFixedExpenses:(fixedItems?.length ?? 0) > 0,
        }}
      />

      <div className="space-y-4">
        <ExpenseChart transactions={transactions} />
        <RecentTransactions transactions={transactions.slice(0, 8)} />
      </div>
    </div>
  )
}
