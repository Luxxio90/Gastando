import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { AccountDetail } from '@/components/accounts/account-detail'
import type { Account } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AccountDetailPage({ params }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { id } = await params

  const [{ data: account }, { data: transactions }, { data: categories }] = await Promise.all([
    supabase.from('accounts').select('*').eq('id', id).eq('user_id', user.id).single(),
    supabase
      .from('transactions')
      .select('*, category:categories(*)')
      .eq('account_id', id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase.from('categories').select('*, expense_type:expense_types(id,name)').or(`user_id.eq.${user.id},is_default.eq.true`).order('name'),
  ])

  if (!account) notFound()

  const { data: allAccounts } = await supabase.from('accounts').select('*').eq('user_id', user.id)

  return (
    <div className="p-4 md:p-6">
      <AccountDetail
        account={account as Account}
        transactions={transactions ?? []}
        categories={categories ?? []}
        accounts={allAccounts ?? []}
        userId={user.id}
      />
    </div>
  )
}
