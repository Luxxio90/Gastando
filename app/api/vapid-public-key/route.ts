import { NextResponse } from 'next/server'

export async function GET() {
  const key = process.env.VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!key) return NextResponse.json({
    error: 'Not configured',
    debug: {
      hasVapidPublicKey: !!process.env.VAPID_PUBLIC_KEY,
      hasNextPublicVapidPublicKey: !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      vapidRelatedKeys: Object.keys(process.env).filter(k => k.toUpperCase().includes('VAPID')),
    }
  }, { status: 500 })
  return NextResponse.json({ key })
}
