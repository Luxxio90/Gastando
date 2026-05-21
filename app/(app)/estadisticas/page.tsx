import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EstadisticasView } from '@/components/estadisticas/estadisticas-view'

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

  const [{ data: transactions }, { data: trendTransactions }, { data: accounts }] = await Promise.all([
    supabase
      .from('transactions')
      .select('type, amount, account_id, description, date, category:categories(name, icon, color)')
      .eq('user_id', user.id)
      .gte('date', firstDay)
      .lte('date', lastDay),
    supabase
      .from('transactions')
      .select('type, amount, date, account_id')
      .eq('user_id', user.id)
      .gte('date', trendStart)
      .lte('date', lastDay),
    supabase
      .from('accounts')
      .select('id, name, color, type')
      .eq('user_id', user.id)
      .order('name'),
  ])

  return (
    <div className="p-4 pb-24 max-w-2xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-foreground">Estadísticas</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Análisis de tus finanzas</p>
      </div>
      <EstadisticasView
        month={month}
        year={year}
        transactions={(transactions ?? []) as any[]}
        trendTransactions={(trendTransactions ?? []) as any[]}
        accounts={(accounts ?? []) as any[]}
      />
    </div>
  )
}
