import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CreditCardsView } from '@/components/tarjetas/credit-cards-view'
import type { CreditCard, CreditCardMonth, CreditCardItem, Account } from '@/types'

export default async function TarjetasPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const params = await searchParams
  const now = new Date()
  const month = parseInt(params.month ?? String(now.getMonth() + 1))
  const year = parseInt(params.year ?? String(now.getFullYear()))

  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year

  const [{ data: cards }, { data: accounts }] = await Promise.all([
    supabase.from('credit_cards').select('*').eq('user_id', user.id).order('created_at'),
    supabase.from('accounts').select('*').eq('user_id', user.id).order('name'),
  ])

  const allCards = (cards ?? []) as CreditCard[]

  if (allCards.length === 0) {
    return (
      <CreditCardsView
        cards={[]}
        months={[]}
        items={[]}
        accounts={(accounts ?? []) as Account[]}
        userId={user.id}
        month={month}
        year={year}
      />
    )
  }

  // Fetch existing credit_card_months for this month
  const { data: existingMonths } = await supabase
    .from('credit_card_months')
    .select('*')
    .eq('user_id', user.id)
    .eq('month', month)
    .eq('year', year)

  let allMonths = (existingMonths ?? []) as CreditCardMonth[]

  // Ensure a credit_card_month exists for every card this month
  const existingCardIds = new Set(allMonths.map(m => m.card_id))
  const missingCards = allCards.filter(c => !existingCardIds.has(c.id))

  if (missingCards.length > 0) {
    // Fetch previous month's data to copy items
    const missingCardIds = missingCards.map(c => c.id)

    const { data: prevMonths } = await supabase
      .from('credit_card_months')
      .select('*')
      .eq('user_id', user.id)
      .eq('month', prevMonth)
      .eq('year', prevYear)
      .in('card_id', missingCardIds)

    // Create new month records for missing cards
    const { data: insertedMonths } = await supabase
      .from('credit_card_months')
      .insert(missingCards.map(c => ({
        card_id: c.id,
        user_id: user.id,
        month,
        year,
        status: 'pending',
      })))
      .select()

    const newMonths = (insertedMonths ?? []) as CreditCardMonth[]
    allMonths = [...allMonths, ...newMonths]

    // Copy items from previous month with installment increment
    if (prevMonths && prevMonths.length > 0) {
      const prevMonthIds = prevMonths.map(pm => pm.id)
      const { data: prevItems } = await supabase
        .from('credit_card_items')
        .select('*')
        .in('card_month_id', prevMonthIds)

      if (prevItems && prevItems.length > 0) {
        // Build prevCardMonthId → newCardMonthId map
        const monthIdMap: Record<string, string> = {}
        for (const pm of prevMonths) {
          const nm = newMonths.find(m => m.card_id === pm.card_id)
          if (nm) monthIdMap[pm.id] = nm.id
        }

        const itemsToCopy = prevItems
          .filter(item => {
            // Skip items where installment series is complete
            if (item.installment_current !== null && item.installment_total !== null) {
              return item.installment_current < item.installment_total
            }
            return true
          })
          .map(item => ({
            card_month_id: monthIdMap[item.card_month_id],
            user_id: user.id,
            description: item.description,
            installment_current: item.installment_current !== null ? item.installment_current + 1 : null,
            installment_total: item.installment_total,
            amount: item.amount,
          }))
          .filter(item => item.card_month_id != null)

        if (itemsToCopy.length > 0) {
          await supabase.from('credit_card_items').insert(itemsToCopy)
        }
      }
    }
  }

  // Fetch all items for this month's card_months
  const allMonthIds = allMonths.map(m => m.id)
  const { data: items } = allMonthIds.length > 0
    ? await supabase.from('credit_card_items').select('*').in('card_month_id', allMonthIds).order('created_at')
    : { data: [] }

  return (
    <CreditCardsView
      key={`${month}-${year}`}
      cards={allCards}
      months={allMonths}
      items={(items ?? []) as CreditCardItem[]}
      accounts={(accounts ?? []) as Account[]}
      userId={user.id}
      month={month}
      year={year}
    />
  )
}
