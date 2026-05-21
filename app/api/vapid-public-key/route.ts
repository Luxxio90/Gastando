import { NextResponse } from 'next/server'

export async function GET() {
  const key = process.env.VAPID_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  console.log('[vapid-public-key] VAPID_PUBLIC_KEY:', !!process.env.VAPID_PUBLIC_KEY)
  console.log('[vapid-public-key] NEXT_PUBLIC_VAPID_PUBLIC_KEY:', !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
  if (!key) return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  return NextResponse.json({ key })
}
