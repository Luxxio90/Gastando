'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Bell, CreditCard, LayoutDashboard, PiggyBank, Settings } from 'lucide-react'

const navItems = [
  { href: '/avisos', label: 'Avisos', icon: Bell },
  { href: '/accounts', label: 'Cuentas', icon: CreditCard },
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard, center: true },
  { href: '/budgets', label: 'Presupuestos', icon: PiggyBank },
  { href: '/settings', label: 'Ajustes', icon: Settings },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 md:hidden">
      <div className="flex items-end justify-around px-2 pb-1 pt-1">
        {navItems.map(({ href, label, icon: Icon, center }) => {
          const active = pathname === href || pathname.startsWith(href + '/')

          if (center) {
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-1 relative -top-5"
              >
                <div className={cn(
                  'h-14 w-14 rounded-full flex items-center justify-center shadow-lg transition-colors',
                  active ? 'bg-emerald-700' : 'bg-gray-900'
                )}>
                  <Icon className="h-6 w-6 text-white" />
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
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl"
            >
              <Icon className={cn('h-5 w-5', active ? 'text-emerald-600' : 'text-gray-400')} />
              <span className={cn('text-xs font-medium', active ? 'text-emerald-600' : 'text-gray-400')}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
