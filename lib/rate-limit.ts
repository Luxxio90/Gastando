type Entry = { hits: number; resetAt: number }

const store = new Map<string, Entry>()

// Cleanup entries older than 5 minutes to avoid memory leaks
function cleanup() {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now > entry.resetAt + 300_000) store.delete(key)
  }
}

export function checkRateLimit(
  key: string,
  maxHits: number,
  windowSecs: number
): { allowed: boolean; remaining: number; retryAfter?: number } {
  if (store.size > 10_000) cleanup()

  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { hits: 1, resetAt: now + windowSecs * 1000 })
    return { allowed: true, remaining: maxHits - 1 }
  }

  if (entry.hits >= maxHits) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    }
  }

  entry.hits++
  return { allowed: true, remaining: maxHits - entry.hits }
}
