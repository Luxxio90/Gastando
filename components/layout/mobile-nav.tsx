'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, CreditCard, PiggyBank, Settings } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { href: '/accounts', label: 'Cuentas', icon: CreditCard },
  { href: '/budgets', label: 'Presupuestos', icon: PiggyBank },
  { href: '/settings', label: 'Ajustes', icon: Settings },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 md:hidden">
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl"
            >
              <Icon className={cn('h-5 w-5', active ? 'text-emerald-600' : 'text-gray-400')} />
              <span className={cn('text-xs font-medium', active ? 'text-emerald-600' : 'text-gray-400')}>
                {label}
              </span>
            </Link>
          )
        })}
        {/* Espacio para el FAB */}
        <div className="w-14" />
      </div>
    </nav>
  )
}
