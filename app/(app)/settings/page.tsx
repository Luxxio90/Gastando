import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SettingsView } from '@/components/settings/settings-view'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: categories }, { data: expenseTypes }, { data: responsibles }] = await Promise.all([
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
  ])

  return (
    <div className="p-6">
      <SettingsView user={user} categories={categories ?? []} expenseTypes={expenseTypes ?? []} responsibles={responsibles ?? []} />
    </div>
  )
}
