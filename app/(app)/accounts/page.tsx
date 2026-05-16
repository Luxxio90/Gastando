import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AccountsList } from '@/components/accounts/accounts-list'

export default async function AccountsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', user.id)
    .order('name')

  return (
    <div className="p-6">
      <AccountsList accounts={accounts ?? []} userId={user.id} />
    </div>
  )
}
