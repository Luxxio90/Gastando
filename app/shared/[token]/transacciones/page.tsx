export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { SharedTransactions } from '@/components/shared/shared-transactions'

export default async function SharedTransactionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ month?: string; year?: string }>
}) {
  const { token } = await params
  const sp = await searchParams

  const now = new Date()
  const month = Math.max(1, Math.min(12, parseInt(sp.month ?? String(now.getMonth() + 1))))
  const year = parseInt(sp.year ?? String(now.getFullYear()))

  const supabase = createServiceClient()

  const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const owner = users.find(u => u.user_metadata?.sa_token === token)
  if (!owner) notFound()

  const account_ids: string[] = owner.user_metadata.sa_accounts ?? []
  const user_id = owner.id

  const firstDay = new Date(year, month - 1, 1).toISOString().split('T')[0]
  const lastDay = new Date(year, month, 0).toISOString().split('T')[0]

  const [{ data: transactions }, { data: accounts }] = await Promise.all([
    supabase
      .from('transactions')
      .select('*, category:categories(id,name,icon,color,type), account:accounts(id,name,color,currency), responsible:responsible_parties(id,name,color)')
      .eq('user_id', user_id)
      .in('account_id', account_ids)
      .gte('date', firstDay)
      .lte('date', lastDay)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase.from('accounts').select('*').in('id', account_ids),
  ])

  return (
    <SharedTransactions
      token={token}
      transactions={transactions ?? []}
      accounts={accounts ?? []}
      month={month}
      year={year}
    />
  )
}
