export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { SharedAvisos } from '@/components/shared/shared-avisos'

export default async function SharedAvisosPage({
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
  const year  = parseInt(sp.year ?? String(now.getFullYear()))

  const supabase = createServiceClient()
  const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const owner = users.find(u => u.user_metadata?.sa_token === token)
  if (!owner) notFound()

  const fixed_group_names: string[] = owner.user_metadata.sa_groups ?? []
  const account_ids: string[]       = owner.user_metadata.sa_accounts ?? []
  const user_id = owner.id

  const [{ data: accounts }, { data: groups }] = await Promise.all([
    supabase.from('accounts').select('*').in('id', account_ids),
    fixed_group_names.length > 0
      ? supabase
          .from('fixed_expense_groups')
          .select('id')
          .eq('user_id', user_id)
          .eq('month', month)
          .eq('year', year)
          .in('name', fixed_group_names)
      : Promise.resolve({ data: [] }),
  ])

  const groupIds = (groups ?? []).map((g: any) => g.id)

  const { data: fixedItems } = groupIds.length > 0
    ? await supabase
        .from('fixed_expense_items')
        .select('*, category:categories(id,name,icon,color), group:fixed_expense_groups(id,name,color)')
        .in('group_id', groupIds)
        .eq('status', 'pending')
        .not('due_day', 'is', null)
        .order('due_day')
    : { data: [] }

  return (
    <SharedAvisos
      token={token}
      fixedItems={(fixedItems ?? []) as any[]}
      accounts={(accounts ?? []) as any[]}
      month={month}
      year={year}
    />
  )
}
