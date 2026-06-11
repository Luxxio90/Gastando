import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  if (process.env.NODE_ENV === 'production')
    return NextResponse.json({ error: 'Only available in development' }, { status: 403 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const vapidPublicKey  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!
  if (!vapidPublicKey || !vapidPrivateKey)
    return NextResponse.json({ error: 'VAPID keys not set' }, { status: 500 })

  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL ?? 'gastando@app.com'}`,
    vapidPublicKey,
    vapidPrivateKey,
  )

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', user.id)

  if (!subs || subs.length === 0)
    return NextResponse.json({ error: 'No hay suscripciones registradas para este usuario. Primero activá las notificaciones en Configuración.' }, { status: 404 })

  const payload = JSON.stringify({
    title: '🔔 Notificación de prueba',
    body: 'Las notificaciones de Gastando funcionan correctamente.',
    url: '/avisos',
  })

  let sent = 0
  const errors: string[] = []

  for (const sub of subs as any[]) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      )
      sent++
    } catch (err: any) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id)
        errors.push(`Suscripción expirada eliminada`)
      } else {
        errors.push(`Error ${err.statusCode ?? 'desconocido'}: ${err.message}`)
      }
    }
  }

  return NextResponse.json({ sent, total: subs.length, errors })
}
