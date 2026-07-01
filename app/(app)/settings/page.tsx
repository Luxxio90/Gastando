import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsView } from '@/components/settings/settings-view'
import { ErrorState } from '@/components/ui/error-state'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const [
    { data: categories, error: catError },
    { data: expenseTypes, error: etError },
    { data: responsibles },
    { data: accounts },
    { data: fixedGroups },
  ] = await Promise.all([
    supabase
      .from('categories')
      .select('*, expense_type:expense_types(id,name,is_default)')
      .or(`user_id.eq.${user.id},is_default.eq.true`)
      .order('type')
      .order('name'),
    supabase
      .from('expense_types')
      .select('*')
      .or(`user_id.eq.${user.id},is_default.eq.true`)
      .order('is_default', { ascending: false })
      .order('name'),
    supabase
      .from('responsible_parties')
      .select('*')
      .eq('user_id', user.id)
      .order('name'),
    supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('name'),
    supabase
      .from('fixed_expense_groups')
      .select('name')
      .eq('user_id', user.id)
      .eq('month', month)
      .eq('year', year),
  ])

  if (catError || etError) return <ErrorState title="Error al cargar los ajustes" />

  const fixedGroupNames = [...new Set((fixedGroups ?? []).map(g => g.name))]
  const meta = user.user_metadata
  const initialSharedAccess = meta?.sa_token
    ? { id: 'metadata', token: meta.sa_token, name: meta.sa_name, account_ids: meta.sa_accounts ?? [], fixed_group_names: meta.sa_groups ?? [] }
    : null

  return (
    <div className="p-6">
      <SettingsView
        user={user}
        categories={categories}
        expenseTypes={expenseTypes}
        responsibles={responsibles ?? []}
        accounts={accounts ?? []}
        fixedGroupNames={fixedGroupNames}
        initialSharedAccess={initialSharedAccess}
      />
    </div>
  )
}
