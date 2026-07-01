'use client'

import { usePathname, useParams } from 'next/navigation'
import Link from 'next/link'
import { Home, List, Bell } from 'lucide-react'

export function SharedFooterNav() {
  const params = useParams()
  const pathname = usePathname()
  const token = params.token as string

  const isHome         = !pathname.includes('/transacciones') && !pathname.includes('/avisos')
  const isTransactions = pathname.includes('/transacciones')
  const isAvisos       = pathname.includes('/avisos')

  const ACTIVE = '#00C9A7'

  const tabs = [
    { label: 'Inicio',         href: `/shared/${token}`,               Icon: Home, active: isHome },
    { label: 'Transacciones',  href: `/shared/${token}/transacciones`,  Icon: List, active: isTransactions },
    { label: 'Avisos',         href: `/shared/${token}/avisos`,         Icon: Bell, active: isAvisos },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-white"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex">
        {tabs.map(({ label, href, Icon, active }) => (
          <Link key={href} href={href}
            className="flex-1 flex flex-col items-center py-3 gap-0.5 transition-colors"
            style={{ color: active ? ACTIVE : 'hsl(var(--muted-foreground))' }}>
            <Icon className="h-5 w-5" />
            <span className="text-[10px] font-semibold">{label}</span>
            {active && <div className="h-0.5 w-4 rounded-full mt-0.5" style={{ backgroundColor: ACTIVE }} />}
          </Link>
        ))}
      </div>
    </div>
  )
}
