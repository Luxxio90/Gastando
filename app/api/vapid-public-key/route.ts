import { NextResponse } from 'next/server'

// VAPID public key — intentionally hardcoded (public keys are safe to embed in code)
const VAPID_PUBLIC_KEY = 'BOJzMll7HVPQ1SV8cQnQnnlSnIgNJfuTtBc6MFCqstBERv8370NOP0RH9cN2lRWT9bq1nzCEoWEsLwxfcD8ZL-s'

export async function GET() {
  return NextResponse.json({ key: VAPID_PUBLIC_KEY })
}
