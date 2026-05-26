import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TransactionList } from '@/components/transactions/transaction-list'
import { ErrorState } from '@/components/ui/error-state'

interface Props {
  searchParams: Promise<{ type?: string }>
}

export default async function TransactionsPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { type } = await searchParams

  const now = new Date()
  const month = now.getMonth() + 1
  const year  = now.getFullYear()
  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`
  const daysInMonth = new Date(year, month, 0).getDate()
  const lastDay = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`

  const [
    { data: transactions, error: txError },
    { data: accounts, error: accError },
    { data: categories, error: catError },
    { data: allRecurring },
    { data: responsibles },
  ] = await Promise.all([
    supabase
      .from('transactions')
      .select('*, category:categories(*), account:accounts(*), responsible:responsible_parties(*)')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .range(0, 29),
    supabase.from('accounts').select('*').eq('user_id', user.id),
    supabase.from('categories').select('*').or(`user_id.eq.${user.id},is_default.eq.true`).order('name'),
    supabase
      .from('recurring_transactions')
      .select('*, category:categories(*), account:accounts(*)')
      .eq('user_id', user.id)
      .order('created_at'),
    supabase.from('responsible_parties').select('*').eq('user_id', user.id).order('name'),
  ])

  if (txError || accError || catError) return <ErrorState title="Error al cargar las transacciones" />

  // ── Materializar recurrentes del mes actual ─────────────────────────────────
  const activeRecurring = (allRecurring ?? []).filter(rt => rt.active)
  if (activeRecurring.length > 0) {
    const { data: materialized } = await supabase
      .from('transactions')
      .select('recurring_transaction_id')
      .eq('user_id', user.id)
      .not('recurring_transaction_id', 'is', null)
      .gte('date', firstDay)
      .lte('date', lastDay)

    const materializedIds = new Set(materialized?.map(t => t.recurring_transaction_id) ?? [])
    const toCreate = activeRecurring.filter(rt => !materializedIds.has(rt.id))

    if (toCreate.length > 0) {
      await supabase.from('transactions').insert(
        toCreate.map(rt => ({
          user_id: rt.user_id,
          type: rt.type,
          amount: rt.amount,
          description: rt.description,
          category_id: rt.category_id,
          account_id: rt.account_id,
          date: `${year}-${String(month).padStart(2, '0')}-${String(Math.min(rt.day_of_month, daysInMonth)).padStart(2, '0')}`,
          notes: rt.notes,
          recurring_transaction_id: rt.id,
        }))
      )

      // Re-fetch transactions after materialization
      const { data: fresh } = await supabase
        .from('transactions')
        .select('*, category:categories(*), account:accounts(*)')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .range(0, 29)

      const initialFilter = type === 'income' ? 'income' : type === 'expense' ? 'expense' : 'all'

      return (
        <div className="p-6">
          <TransactionList
            transactions={fresh ?? []}
            accounts={accounts ?? []}
            categories={categories ?? []}
            responsibles={responsibles ?? []}
            userId={user.id}
            initialFilter={initialFilter}
            recurring={allRecurring ?? []}
          />
        </div>
      )
    }
  }

  const initialFilter = type === 'income' ? 'income' : type === 'expense' ? 'expense' : 'all'

  return (
    <div className="p-6">
      <TransactionList
        transactions={transactions ?? []}
        accounts={accounts ?? []}
        categories={categories ?? []}
        responsibles={responsibles ?? []}
        userId={user.id}
        initialFilter={initialFilter}
        recurring={allRecurring ?? []}
      />
    </div>
  )
}
