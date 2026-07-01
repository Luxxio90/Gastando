'use client'

import { usePathname, useParams } from 'next/navigation'
import Link from 'next/link'
import { Home, List } from 'lucide-react'

export function SharedFooterNav() {
  const params = useParams()
  const pathname = usePathname()
  const token = params.token as string

  const isTransactions = pathname.includes('/transacciones')

  const ACTIVE = '#00C9A7'

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border"
      style={{ background: 'hsl(var(--card, #fff))', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex">
        <Link href={`/shared/${token}`}
          className="flex-1 flex flex-col items-center py-3 gap-0.5 transition-colors"
          style={{ color: !isTransactions ? ACTIVE : 'hsl(var(--muted-foreground))' }}>
          <Home className="h-5 w-5" />
          <span className="text-[10px] font-semibold">Inicio</span>
          {!isTransactions && <div className="h-0.5 w-4 rounded-full mt-0.5" style={{ backgroundColor: ACTIVE }} />}
        </Link>
        <Link href={`/shared/${token}/transacciones`}
          className="flex-1 flex flex-col items-center py-3 gap-0.5 transition-colors"
          style={{ color: isTransactions ? ACTIVE : 'hsl(var(--muted-foreground))' }}>
          <List className="h-5 w-5" />
          <span className="text-[10px] font-semibold">Transacciones</span>
          {isTransactions && <div className="h-0.5 w-4 rounded-full mt-0.5" style={{ backgroundColor: ACTIVE }} />}
        </Link>
      </div>
    </div>
  )
}
