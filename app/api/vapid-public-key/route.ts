import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  const { allowed, retryAfter } = checkRateLimit(`vapid:${ip}`, 30, 60)
  if (!allowed)
    return NextResponse.json({ error: 'Too many requests' }, {
      status: 429,
      headers: { 'Retry-After': String(retryAfter) },
    })

  if (!VAPID_PUBLIC_KEY)
    return NextResponse.json({ error: 'VAPID_PUBLIC_KEY not set' }, { status: 500 })

  return NextResponse.json({ key: VAPID_PUBLIC_KEY })
}
