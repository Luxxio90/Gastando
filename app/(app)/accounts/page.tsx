import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AccountsList } from '@/components/accounts/accounts-list'
import { ErrorState } from '@/components/ui/error-state'

export default async function AccountsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: accounts, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', user.id)
    .order('name')

  if (error) return <ErrorState title="Error al cargar las cuentas" />

  return (
    <div className="p-6 pb-28">
      <AccountsList accounts={accounts} userId={user.id} />
    </div>
  )
}
