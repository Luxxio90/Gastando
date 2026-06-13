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
    <div className="min-h-screen" style={{ backgroundColor: '#F5F5F7' }}>
      {/* Hero */}
      <div
        className="relative overflow-hidden px-5 pt-10 pb-16"
        style={{ background: 'linear-gradient(135deg, #00CB96 0%, #00C9A7 100%)' }}
      >
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10" style={{ backgroundColor: '#fff' }} />
        <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full opacity-10" style={{ backgroundColor: '#fff' }} />
        <div className="relative">
          <p className="text-white/70 text-xs font-medium uppercase tracking-wider">Balance y gestión</p>
          <h1 className="text-white text-xl font-bold mt-0.5">Mis cuentas</h1>
        </div>
      </div>

      <div className="relative -mt-8 p-4 pb-28">
        <AccountsList accounts={accounts} userId={user.id} />
      </div>
    </div>
  )
}
