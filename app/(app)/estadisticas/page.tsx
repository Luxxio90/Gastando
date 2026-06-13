import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EstadisticasView } from '@/components/estadisticas/estadisticas-view'
import { ErrorState } from '@/components/ui/error-state'

export default async function EstadisticasPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const params = await searchParams
  const now   = new Date()
  const month = parseInt(params.month ?? String(now.getMonth() + 1))
  const year  = parseInt(params.year  ?? String(now.getFullYear()))

  const firstDay = new Date(year, month - 1, 1).toISOString()
  const lastDay  = new Date(year, month, 0, 23, 59, 59).toISOString()

  // 6-month window for trend chart
  let trendMonth = month - 5, trendYear = year
  while (trendMonth <= 0) { trendMonth += 12; trendYear-- }
  const trendStart = new Date(trendYear, trendMonth - 1, 1).toISOString()

  const [
    { data: transactions, error: txError },
    { data: trendTransactions, error: trendError },
    { data: accounts, error: accError },
    { data: responsibles },
  ] = await Promise.all([
    supabase
      .from('transactions')
      .select('type, amount, account_id, description, date, transfer_group_id, responsible_party_id, category:categories(name, icon, color)')
      .eq('user_id', user.id)
      .gte('date', firstDay)
      .lte('date', lastDay),
    supabase
      .from('transactions')
      .select('type, amount, date, account_id, transfer_group_id')
      .eq('user_id', user.id)
      .gte('date', trendStart)
      .lte('date', lastDay),
    supabase
      .from('accounts')
      .select('id, name, color, type')
      .eq('user_id', user.id)
      .order('name'),
    supabase
      .from('responsible_parties')
      .select('id, name, color')
      .eq('user_id', user.id)
      .order('name'),
  ])

  if (txError || trendError || accError) return <ErrorState title="Error al cargar las estadísticas" />

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F5F7' }}>
      {/* Hero */}
      <div
        className="relative overflow-hidden px-5 pt-10 pb-16"
        style={{ background: 'linear-gradient(135deg, #3BB2F6 0%, #7C4DFF 100%)' }}
      >
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10" style={{ backgroundColor: '#fff' }} />
        <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full opacity-10" style={{ backgroundColor: '#fff' }} />
        <div className="relative">
          <p className="text-white/70 text-xs font-medium uppercase tracking-wider">Finanzas personales</p>
          <h1 className="text-white text-xl font-bold mt-0.5">Estadísticas</h1>
        </div>
      </div>

      <div className="relative -mt-8 px-4 pb-24 space-y-4 max-w-2xl mx-auto">
      <EstadisticasView
        month={month}
        year={year}
        transactions={(transactions ?? []) as any[]}
        trendTransactions={(trendTransactions ?? []) as any[]}
        accounts={(accounts ?? []) as any[]}
        responsibles={(responsibles ?? []) as any[]}
      />
      </div>
    </div>
  )
}
