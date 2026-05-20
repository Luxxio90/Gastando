import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AvisosView } from '@/components/avisos/avisos-view'

export default async function AvisosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  // Fetch pending fixed expenses with a due_day set (current month)
  const { data: rawFixed } = await supabase
    .from('fixed_expense_items')
    .select('*, category:categories(id,name,icon,color)')
    .eq('user_id', user.id)
    .eq('month', month)
    .eq('year', year)
    .eq('status', 'pending')
    .not('due_day', 'is', null)

  // Fetch pending credit card months with a due_date set (current month)
  const { data: rawMonths } = await supabase
    .from('credit_card_months')
    .select('*, card:credit_cards(id,name,network)')
    .eq('user_id', user.id)
    .eq('month', month)
    .eq('year', year)
    .eq('status', 'pending')
    .not('due_date', 'is', null)

  // Fetch items to compute totals per card month
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

  const monthLabel = now.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

  return (
    <div className="p-4 pb-24 max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Avisos</h1>
        <p className="text-sm text-muted-foreground mt-0.5 capitalize">{monthLabel}</p>
      </div>
      <AvisosView
        fixedExpenses={(rawFixed ?? []) as any[]}
        cardMonths={cardMonths as any[]}
        userId={user.id}
      />
    </div>
  )
}
