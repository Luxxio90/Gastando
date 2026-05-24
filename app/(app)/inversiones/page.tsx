import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { InversionesView } from '@/components/inversiones/inversiones-view'
import { ErrorState } from '@/components/ui/error-state'
import type { Investment } from '@/types'

export default async function InversionesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data, error } = await supabase
    .from('investments')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return <ErrorState title="Error al cargar las inversiones" />

  return (
    <div className="p-4 pb-28 max-w-lg mx-auto">
      <InversionesView
        investments={(data ?? []) as Investment[]}
        userId={user.id}
      />
    </div>
  )
}
