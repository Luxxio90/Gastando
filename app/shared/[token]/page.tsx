export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { SharedDashboard } from '@/components/shared/shared-dashboard'

export default async function SharedPage({
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
  const fixed_group_names: string[] = owner.user_metadata.sa_groups ?? []
  const user_id = owner.id
  const sharedAccess = {
    id: 'metadata', token,
    name: owner.user_metadata.sa_name as string,
    account_ids,
    fixed_group_names,
  }

  const firstDay = new Date(year, month - 1, 1).toISOString().split('T')[0]
  const lastDay = new Date(year, month, 0).toISOString().split('T')[0]

  const [
    { data: accounts },
    { data: transactions },
    { data: budgetCards },
    { data: fixedGroups },
    { data: categories },
    { data: responsibles },
  ] = await Promise.all([
    supabase.from('accounts').select('*').in('id', account_ids),
    supabase
      .from('transactions')
      .select('*, category:categories(id,name,icon,color,type)')
      .eq('user_id', user_id)
      .in('account_id', account_ids)
      .gte('date', firstDay)
      .lte('date', lastDay),
    supabase
      .from('budget_cards')
      .select('*, sum_category:categories!sum_category_id(id,name,icon,type)')
      .eq('user_id', user_id)
      .eq('month', month)
      .eq('year', year)
      .order('created_at'),
    fixed_group_names.length > 0
      ? supabase
          .from('fixed_expense_groups')
          .select('*')
          .eq('user_id', user_id)
          .eq('month', month)
          .eq('year', year)
          .in('name', fixed_group_names)
          .order('order')
      : Promise.resolve({ data: [] }),
    supabase.from('categories').select('*').or(`user_id.eq.${user_id},is_default.eq.true`).order('name'),
    supabase.from('responsible_parties').select('*').eq('user_id', user_id).order('name'),
  ])

  const groupIds = (fixedGroups ?? []).map((g: any) => g.id)
  const { data: fixedItems } = groupIds.length > 0
    ? await supabase
        .from('fixed_expense_items')
        .select('*, category:categories(id,name,icon,color)')
        .in('group_id', groupIds)
        .order('created_at')
    : { data: [] }

  return (
    <SharedDashboard
      sharedAccess={sharedAccess}
      accounts={accounts ?? []}
      transactions={transactions ?? []}
      budgetCards={budgetCards ?? []}
      fixedGroups={fixedGroups ?? []}
      fixedItems={fixedItems ?? []}
      categories={categories ?? []}
      responsibles={responsibles ?? []}
      month={month}
      year={year}
    />
  )
}
