'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Bell, CreditCard, LayoutDashboard, PiggyBank, Wallet } from 'lucide-react'

const navItems = [
  { href: '/tarjetas', label: 'Tarjetas', icon: Wallet },
  { href: '/accounts', label: 'Cuentas', icon: CreditCard },
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard, center: true },
  { href: '/budgets', label: 'Distribución', icon: PiggyBank },
  { href: '/avisos', label: 'Avisos', icon: Bell },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-100 md:hidden shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-around px-1 py-2">
        {navItems.map(({ href, label, icon: Icon, center }) => {
          const active = pathname === href || pathname.startsWith(href + '/')

          if (center) {
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-1"
              >
                <div className={cn(
                  'h-11 w-11 rounded-2xl flex items-center justify-center transition-colors',
                  active ? 'bg-emerald-500' : 'bg-gray-900'
                )}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <span className={cn('text-xs font-medium', active ? 'text-emerald-600' : 'text-gray-400')}>
                  {label}
                </span>
              </Link>
            )
          }

          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl"
            >
              <Icon className={cn('h-5 w-5', active ? 'text-emerald-500' : 'text-gray-400')} />
              <span className={cn('text-xs font-medium', active ? 'text-emerald-500' : 'text-gray-400')}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
