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

  const [
    { data: transactions, error: txError },
    { data: accounts, error: accError },
    { data: categories, error: catError },
  ] = await Promise.all([
    supabase
      .from('transactions')
      .select('*, category:categories(*), account:accounts(*)')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .range(0, 29),
    supabase.from('accounts').select('*').eq('user_id', user.id),
    supabase.from('categories').select('*').or(`user_id.eq.${user.id},is_default.eq.true`).order('name'),
  ])

  if (txError || accError || catError) return <ErrorState title="Error al cargar las transacciones" />

  const initialFilter = type === 'income' ? 'income' : type === 'expense' ? 'expense' : 'all'

  return (
    <div className="p-6">
      <TransactionList
        transactions={transactions}
        accounts={accounts}
        categories={categories}
        userId={user.id}
        initialFilter={initialFilter}
      />
    </div>
  )
}
