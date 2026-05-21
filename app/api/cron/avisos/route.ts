import { NextRequest, NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL ?? 'gastando@app.com'}`,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )

  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = await createClient()

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowDay   = tomorrow.getDate()
  const tomorrowMonth = tomorrow.getMonth() + 1
  const tomorrowYear  = tomorrow.getFullYear()
  const tomorrowStr   = tomorrow.toISOString().split('T')[0]

  // Fetch subscriptions
  const { data: subs } = await supabase.from('push_subscriptions').select('*')
  if (!subs || subs.length === 0) return NextResponse.json({ sent: 0 })

  const userIds = [...new Set(subs.map((s: any) => s.user_id as string))]

  // Fetch fixed expenses due tomorrow
  const { data: fixedItems } = await supabase
    .from('fixed_expense_items')
    .select('user_id, amount, description, due_day, category:categories(name)')
    .in('user_id', userIds)
    .eq('month', tomorrowMonth)
    .eq('year', tomorrowYear)
    .eq('due_day', tomorrowDay)
    .eq('status', 'pending')

  // Fetch credit card months due tomorrow
  const { data: cardMonths } = await supabase
    .from('credit_card_months')
    .select('user_id, due_date, card:credit_cards(name)')
    .in('user_id', userIds)
    .eq('due_date', tomorrowStr)
    .eq('status', 'pending')

  // Fetch card item totals
  const cardMonthIds = (cardMonths ?? []).map((cm: any) => cm.id as string)
  const { data: cardItems } = cardMonthIds.length > 0
    ? await supabase.from('credit_card_items').select('card_month_id, amount').in('card_month_id', cardMonthIds)
    : { data: [] }

  const cardTotals: Record<string, number> = {}
  for (const ci of (cardItems ?? []) as any[]) {
    cardTotals[ci.card_month_id] = (cardTotals[ci.card_month_id] ?? 0) + ci.amount
  }

  // Build notifications per user
  const notifications: Record<string, { title: string; body: string; url: string }[]> = {}

  for (const item of (fixedItems ?? []) as any[]) {
    const name = item.description || (item.category as any)?.name || 'Gasto fijo'
    if (!notifications[item.user_id]) notifications[item.user_id] = []
    notifications[item.user_id].push({
      title: '💸 Vence mañana',
      body: `${name} — $${item.amount.toLocaleString('es-AR')}`,
      url: '/avisos',
    })
  }

  for (const cm of (cardMonths ?? []) as any[]) {
    const cardName = (cm.card as any)?.name ?? 'Tarjeta'
    const total    = cardTotals[cm.id] ?? 0
    if (!notifications[cm.user_id]) notifications[cm.user_id] = []
    notifications[cm.user_id].push({
      title: '💳 Tarjeta vence mañana',
      body: `${cardName}${total > 0 ? ` — $${total.toLocaleString('es-AR')}` : ''}`,
      url: '/avisos',
    })
  }

  let sent = 0
  for (const sub of subs as any[]) {
    const userNotifs = notifications[sub.user_id]
    if (!userNotifs || userNotifs.length === 0) continue

    // Merge multiple notifications into one if needed
    const payload = userNotifs.length === 1
      ? userNotifs[0]
      : {
          title: `💸 ${userNotifs.length} vencimientos mañana`,
          body: userNotifs.map(n => n.body).join('\n'),
          url: '/avisos',
        }

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      )
      sent++
    } catch (err: any) {
      // Subscription expired or invalid — remove it
      if (err.statusCode === 404 || err.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id)
      }
    }
  }

  return NextResponse.json({ sent })
}
