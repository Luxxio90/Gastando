import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AvisosView } from '@/components/avisos/avisos-view'
import { MonthNav } from '@/components/dashboard/month-nav'
import { ErrorState } from '@/components/ui/error-state'

export default async function AvisosPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const params = await searchParams
  const now    = new Date()
  const month  = parseInt(params.month ?? String(now.getMonth() + 1))
  const year   = parseInt(params.year  ?? String(now.getFullYear()))

  const [
    { data: accounts, error: accError },
    { data: responsibles },
  ] = await Promise.all([
    supabase.from('accounts').select('*').eq('user_id', user.id).order('name'),
    supabase.from('responsible_parties').select('*').eq('user_id', user.id).order('name'),
  ])

  if (accError) return <ErrorState title="Error al cargar los avisos" />

  const { data: rawFixed } = await supabase
    .from('fixed_expense_items')
    .select('*, category:categories(id,name,icon,color), group:fixed_expense_groups(id,name,color)')
    .eq('user_id', user.id)
    .eq('month', month)
    .eq('year', year)
    .eq('status', 'pending')
    .not('due_day', 'is', null)

  const { data: rawMonths } = await supabase
    .from('credit_card_months')
    .select('*, card:credit_cards(id,name,network,account_id)')
    .eq('user_id', user.id)
    .eq('month', month)
    .eq('year', year)
    .eq('status', 'pending')
    .not('due_date', 'is', null)

  const monthIds = (rawMonths ?? []).map((m: any) => m.id as string)
  const { data: rawItems } = monthIds.length > 0
    ? await supabase.from('credit_card_items').select('card_month_id, amount').in('card_month_id', monthIds)
    : { data: [] }

  const cardTotals: Record<string, number> = {}
  for (const item of (rawItems ?? [])) {
    const i = item as { card_month_id: string; amount: number }
    cardTotals[i.card_month_id] = (cardTotals[i.card_month_id] ?? 0) + i.amount
  }

  const cardMonths = (rawMonths ?? []).map((m: any) => ({ ...m, total: cardTotals[m.id] ?? 0 }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rawExceeded } = await (supabase as any)
    .from('budget_cards')
    .select('id, name, exceeded_at, track_account_id')
    .eq('user_id', user.id)
    .eq('month', month)
    .eq('year', year)
    .not('exceeded_at', 'is', null)
    .not('track_account_id', 'is', null)

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F5F7' }}>
      {/* Hero */}
      <div
        className="relative overflow-hidden px-5 pt-10 pb-16"
        style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #FF4D6D 100%)' }}
      >
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10" style={{ backgroundColor: '#fff' }} />
        <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full opacity-10" style={{ backgroundColor: '#fff' }} />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-white/70 text-xs font-medium uppercase tracking-wider">Vencimientos</p>
            <h1 className="text-white text-xl font-bold mt-0.5">Avisos</h1>
          </div>
          <MonthNav month={month} year={year} basePath="/avisos" light />
        </div>
      </div>

      <div className="relative -mt-8 p-4 pb-24 max-w-2xl mx-auto space-y-4">
      <AvisosView
        fixedExpenses={(rawFixed ?? []) as any[]}
        cardMonths={cardMonths as any[]}
        exceededBudgets={(rawExceeded ?? []) as any[]}
        userId={user.id}
        accounts={(accounts ?? []) as any[]}
        responsibles={(responsibles ?? []) as any[]}
        month={month}
        year={year}
      />
      </div>
    </div>
  )
}
