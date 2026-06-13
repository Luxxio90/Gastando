import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ExpenseChart } from '@/components/dashboard/expense-chart'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import { DashboardCards } from '@/components/dashboard/dashboard-cards'
import { BudgetProgressCard } from '@/components/dashboard/budget-progress-card'
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
    supabase.from('fixed_expense_items').select('amount, status').eq('user_id', user.id).eq('month', month).eq('year', year),
  ])

  if (txError || accError) return <ErrorState title="Error al cargar el dashboard" />

  const allTx = transactions ?? []
  const monthIncome   = allTx.filter(t => t.type === 'income'  && !t.transfer_group_id).reduce((s, t) => s + t.amount, 0)
  const monthExpenses = allTx.filter(t => t.type === 'expense' && !t.transfer_group_id).reduce((s, t) => s + t.amount, 0)
  const fixedTotal    = (fixedItems ?? []).reduce((s: number, i: any) => s + (i.amount ?? 0), 0)
  const fixedPaid     = (fixedItems ?? []).filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + (i.amount ?? 0), 0)

  const userName = user.email?.split('@')[0] ?? 'usuario'
  const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F5F7' }}>
      {/* Hero teal */}
      <div
        className="relative overflow-hidden px-5 pt-10 pb-20"
        style={{ background: 'linear-gradient(135deg, #00C9A7 0%, #00B4D8 100%)' }}
      >
        {/* Círculos decorativos */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10" style={{ backgroundColor: '#fff' }} />
        <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full opacity-10" style={{ backgroundColor: '#fff' }} />

        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-white/70 text-xs font-medium uppercase tracking-wider">{MONTHS[month - 1]} {year}</p>
            <h1 className="text-white text-xl font-bold mt-0.5">Hola, {userName} 👋</h1>
          </div>
          <MonthNav month={month} year={year} light />
        </div>
      </div>

      {/* Contenido principal — se superpone al hero */}
      <div className="relative -mt-12 px-4 pb-6 space-y-4">
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
          <BudgetProgressCard
            monthIncome={monthIncome}
            monthExpenses={monthExpenses}
            fixedTotal={fixedTotal}
            fixedPaid={fixedPaid}
          />
          <ExpenseChart transactions={transactions} />
          <RecentTransactions transactions={transactions.slice(0, 8)} />
        </div>
      </div>
    </div>
  )
}
