import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ExpenseChart } from '@/components/dashboard/expense-chart'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'
import { DashboardCards } from '@/components/dashboard/dashboard-cards'
import { DrawerMenu } from '@/components/layout/drawer-menu'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()

  const [{ data: transactions }, { data: accounts }, { data: investments }] = await Promise.all([
    supabase
      .from('transactions')
      .select('*, category:categories(*), account:accounts(*)')
      .eq('user_id', user.id)
      .gte('date', firstDay)
      .lte('date', lastDay)
      .order('date', { ascending: false }),
    supabase.from('accounts').select('*').eq('user_id', user.id),
    supabase.from('investments').select('*').eq('user_id', user.id),
  ])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm">{now.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}</p>
        </div>
        <DrawerMenu userEmail={user.email} />
      </div>

      <DashboardCards
        accounts={accounts ?? []}
        transactions={transactions ?? []}
        investments={investments ?? []}
        userId={user.id}
      />

      <div className="space-y-4">
        <ExpenseChart transactions={transactions ?? []} />
        <RecentTransactions transactions={(transactions ?? []).slice(0, 8)} />
      </div>
    </div>
  )
}
