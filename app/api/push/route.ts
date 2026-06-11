import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { allowed, retryAfter } = checkRateLimit(`push:post:${user.id}`, 10, 60)
  if (!allowed)
    return NextResponse.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': String(retryAfter) },
    })

  const body = await req.json()
  const { endpoint, p256dh, auth } = body
  if (!endpoint || !p256dh || !auth ||
      typeof endpoint !== 'string' || typeof p256dh !== 'string' || typeof auth !== 'string')
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  // Rate limit: max 5 push subscriptions per user
  const { count } = await supabase
    .from('push_subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .neq('endpoint', endpoint)
  if ((count ?? 0) >= 5)
    return NextResponse.json({ error: 'Too many subscriptions' }, { status: 429 })

  const { error } = await supabase.from('push_subscriptions').upsert(
    { user_id: user.id, endpoint, p256dh, auth },
    { onConflict: 'user_id,endpoint' }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { allowed, retryAfter } = checkRateLimit(`push:delete:${user.id}`, 10, 60)
  if (!allowed)
    return NextResponse.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': String(retryAfter) },
    })

  const { endpoint } = await req.json()
  await supabase.from('push_subscriptions').delete()
    .eq('user_id', user.id).eq('endpoint', endpoint)

  return NextResponse.json({ ok: true })
}
