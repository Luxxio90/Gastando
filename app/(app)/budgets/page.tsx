import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BudgetCardsView } from '@/components/budgets/budget-cards-view'
import { FixedExpensesTable } from '@/components/budgets/fixed-expenses-table'
import { ErrorState } from '@/components/ui/error-state'
import { BudgetCard, FixedExpenseItem, FixedExpenseGroup, Responsible } from '@/types'

export default async function BudgetsPage({
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
  const year  = parseInt(params.year  ?? String(now.getFullYear()))

  const firstDay = new Date(year, month - 1, 1).toISOString()
  const lastDay  = new Date(year, month, 0).toISOString()
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear  = month === 1 ? year - 1 : year

  const [
    { data: cards, error: cardsError },
    { data: categories, error: catError },
    { data: transactions, error: txError },
    { data: fixedItems },
    { data: expenseTypes },
    { data: responsibles },
    { data: existingGroups },
    { data: accounts },
  ] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('budget_cards')
      .select('*, sum_category:categories!sum_category_id(id,name,icon,type), track_category:categories!track_category_id(id,name,icon,type)')
      .eq('user_id', user.id).eq('month', month).eq('year', year).order('created_at'),
    supabase
      .from('categories')
      .select('*, expense_type:expense_types(id,name,is_default)')
      .or(`user_id.eq.${user.id},is_default.eq.true`).order('type').order('name'),
    supabase
      .from('transactions')
      .select('category_id, amount, type, account_id, transfer_group_id')
      .eq('user_id', user.id).gte('date', firstDay).lte('date', lastDay),
    supabase
      .from('fixed_expense_items')
      .select('*, category:categories(id,name,icon,color)')
      .eq('user_id', user.id).eq('month', month).eq('year', year).order('created_at'),
    supabase
      .from('expense_types')
      .select('id, name')
      .or(`user_id.eq.${user.id},is_default.eq.true`),
    supabase
      .from('responsible_parties')
      .select('*')
      .eq('user_id', user.id).order('name'),
    supabase
      .from('fixed_expense_groups')
      .select('*')
      .eq('user_id', user.id).eq('month', month).eq('year', year).order('order'),
    supabase.from('accounts').select('*').eq('user_id', user.id).order('name'),
  ])

  if (cardsError || catError || txError) return <ErrorState title="Error al cargar la distribución" />

  let allCards      = (cards      ?? []) as BudgetCard[]
  let allFixedItems = (fixedItems ?? []) as FixedExpenseItem[]
  let allGroups     = (existingGroups ?? []) as FixedExpenseGroup[]

  // ── Auto-copy budget cards ──────────────────────────────────────────────────
  if (allCards.length === 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: prevCards } = await (supabase as any)
      .from('budget_cards').select('*')
      .eq('user_id', user.id).eq('month', prevMonth).eq('year', prevYear).order('created_at')

    if (prevCards && prevCards.length > 0) {
      const nonPct = prevCards.filter(c => c.calc_type !== 'percentage')
      const pct    = prevCards.filter(c => c.calc_type === 'percentage')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: insertedNonPct } = await (supabase as any)
        .from('budget_cards')
        .insert(nonPct.map((c: any) => ({
          user_id: user.id, month, year,
          name: c.name, color: c.color, card_type: c.card_type, calc_type: c.calc_type,
          manual_amount: 0, sum_category_id: c.sum_category_id,
          percentage: c.percentage, source_card_id: null, track_category_id: c.track_category_id,
        })))
        .select()

      const idMap: Record<string, string> = {}
      nonPct.forEach((old, i) => { if (insertedNonPct?.[i]) idMap[old.id] = insertedNonPct[i].id })

      if (pct.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('budget_cards').insert(
          pct.map((c: any) => ({
            user_id: user.id, month, year,
            name: c.name, color: c.color, card_type: c.card_type, calc_type: 'percentage',
            manual_amount: 0, sum_category_id: c.sum_category_id, percentage: c.percentage,
            source_card_id: c.source_card_id ? (idMap[c.source_card_id] ?? null) : null,
            track_category_id: c.track_category_id,
          }))
        )
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newCards } = await (supabase as any)
        .from('budget_cards')
        .select('*, sum_category:categories!sum_category_id(id,name,icon,type), track_category:categories!track_category_id(id,name,icon,type)')
        .eq('user_id', user.id).eq('month', month).eq('year', year).order('created_at')

      allCards = (newCards ?? []) as BudgetCard[]
    }
  }

  // ── Migration: existing items without group_id → create "General" group ────
  const hasUngroupedItems = allFixedItems.some(i => !i.group_id)
  if (hasUngroupedItems && allGroups.length === 0) {
    const { data: defaultGroup } = await supabase
      .from('fixed_expense_groups')
      .insert({ user_id: user.id, month, year, name: 'General', color: '#7C4DFF', order: 0 })
      .select().single()

    if (defaultGroup) {
      allGroups = [defaultGroup as FixedExpenseGroup]
      await supabase
        .from('fixed_expense_items')
        .update({ group_id: defaultGroup.id })
        .eq('user_id', user.id).eq('month', month).eq('year', year).is('group_id', null)

      const { data: updatedItems } = await supabase
        .from('fixed_expense_items')
        .select('*, category:categories(id,name,icon,color)')
        .eq('user_id', user.id).eq('month', month).eq('year', year).order('created_at')
      allFixedItems = (updatedItems ?? []) as FixedExpenseItem[]
    }
  }

  // ── Auto-copy fixed expense groups + items ──────────────────────────────────
  if (allGroups.length === 0 && allFixedItems.length === 0) {
    const { data: prevGroups } = await supabase
      .from('fixed_expense_groups').select('*')
      .eq('user_id', user.id).eq('month', prevMonth).eq('year', prevYear).order('order')

    if (prevGroups && prevGroups.length > 0) {
      const { data: insertedGroups } = await supabase
        .from('fixed_expense_groups')
        .insert(prevGroups.map(g => ({ user_id: user.id, month, year, name: g.name, color: g.color, order: g.order })))
        .select()

      if (insertedGroups) {
        allGroups = insertedGroups as FixedExpenseGroup[]

        const groupIdMap: Record<string, string> = {}
        prevGroups.forEach((pg, i) => { if (insertedGroups[i]) groupIdMap[pg.id] = insertedGroups[i].id })

        const { data: prevItems } = await supabase
          .from('fixed_expense_items').select('*')
          .eq('user_id', user.id).eq('month', prevMonth).eq('year', prevYear)

        if (prevItems && prevItems.length > 0) {
          const { data: insertedItems } = await supabase
            .from('fixed_expense_items')
            .insert(prevItems.map(item => ({
              user_id: user.id, month, year,
              group_id: item.group_id ? (groupIdMap[item.group_id] ?? null) : null,
              category_id: item.category_id,
              description: item.description,
              responsible: item.responsible,
              due_day: item.due_day,
              amount: 0,
              status: 'pending',
            })))
            .select('*, category:categories(id,name,icon,color)')
          allFixedItems = (insertedItems ?? []) as FixedExpenseItem[]
        }
      }
    }
  }

  // ── Compute amounts ─────────────────────────────────────────────────────────
  const allTransactions = transactions ?? []
  const incomeByCat: Record<string, number>  = {}
  const expenseByCat: Record<string, number> = {}
  for (const t of allTransactions) {
    if (t.type === 'income') incomeByCat[t.category_id]  = (incomeByCat[t.category_id]  ?? 0) + t.amount
    else                     expenseByCat[t.category_id] = (expenseByCat[t.category_id] ?? 0) + t.amount
  }

  const resolvedAmounts: Record<string, number> = {}
  for (const card of allCards) {
    if (card.calc_type === 'manual') {
      resolvedAmounts[card.id] = card.manual_amount ?? 0
    } else if (card.calc_type === 'category_sum') {
      const cat = card.sum_category_id ?? ''
      resolvedAmounts[card.id] = card.card_type === 'income' ? (incomeByCat[cat] ?? 0) : (expenseByCat[cat] ?? 0)
    } else if (card.calc_type === 'percentage' && card.source_card_id) {
      resolvedAmounts[card.id] = (resolvedAmounts[card.source_card_id] ?? 0) * (card.percentage ?? 0) / 100
    }
  }

  // ── Tracking: actual spending by account ────────────────────────────────────
  const trackingCards = allCards.filter(c => c.track_account_id)
  const actualByCard: Record<string, number> = {}
  for (const card of trackingCards) {
    actualByCard[card.id] = allTransactions
      .filter(t => t.account_id === card.track_account_id && t.type === 'expense' && !t.transfer_group_id)
      .reduce((s, t) => s + t.amount, 0)
  }

  // Update exceeded_at if status changed
  const nowISO = new Date().toISOString()
  await Promise.all(
    trackingCards
      .filter(card => {
        const exceeded = (actualByCard[card.id] ?? 0) > (resolvedAmounts[card.id] ?? 0)
        return (exceeded && !card.exceeded_at) || (!exceeded && !!card.exceeded_at)
      })
      .map(card => {
        const exceeded = (actualByCard[card.id] ?? 0) > (resolvedAmounts[card.id] ?? 0)
        card.exceeded_at = exceeded ? nowISO : null
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (supabase as any).from('budget_cards').update({ exceeded_at: card.exceeded_at }).eq('id', card.id)
      })
  )

  const fixedTypeId      = expenseTypes?.find(et => et.name === 'Gasto fijo')?.id
  const fixedCategories  = (categories ?? []).filter(c => c.type === 'expense' && c.expense_type_id === fixedTypeId)

  return (
    <div className="p-6 pb-28">
      <BudgetCardsView
        cards={allCards}
        categories={categories ?? []}
        resolvedAmounts={resolvedAmounts}
        actualByCard={actualByCard}
        incomeByCat={incomeByCat}
        expenseByCat={expenseByCat}
        accounts={(accounts ?? []) as any[]}
        userId={user.id}
        month={month}
        year={year}
      />
      <FixedExpensesTable
        key={`${month}-${year}`}
        groups={allGroups}
        items={allFixedItems}
        fixedCategories={fixedCategories}
        responsibles={(responsibles ?? []) as Responsible[]}
        accounts={(accounts ?? []) as any[]}
        userId={user.id}
        month={month}
        year={year}
      />
    </div>
  )
}
