import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { InvestmentsList } from '@/components/investments/investments-list'

export default async function InvestmentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: investments } = await supabase
    .from('investments')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-6">
      <InvestmentsList investments={investments ?? []} userId={user.id} />
    </div>
  )
}
