import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { TransactionList } from '@/components/transactions/transaction-list'

export default async function TransactionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: transactions }, { data: accounts }, { data: categories }] = await Promise.all([
    supabase
      .from('transactions')
      .select('*, category:categories(*), account:accounts(*)')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(100),
    supabase.from('accounts').select('*').eq('user_id', user.id),
    supabase.from('categories').select('*').or(`user_id.eq.${user.id},is_default.eq.true`).order('name'),
  ])

  return (
    <div className="p-6">
      <TransactionList
        transactions={transactions ?? []}
        accounts={accounts ?? []}
        categories={categories ?? []}
        userId={user.id}
      />
    </div>
  )
}
