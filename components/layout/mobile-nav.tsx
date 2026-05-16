'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ArrowUpCircle, ArrowDownCircle, LayoutDashboard, CreditCard, Settings } from 'lucide-react'

const navItems = [
  { href: '/transactions?type=income', match: '/transactions?type=income', label: 'Ingresos', icon: ArrowUpCircle, color: 'text-emerald-500' },
  { href: '/transactions?type=expense', match: '/transactions?type=expense', label: 'Gastos', icon: ArrowDownCircle, color: 'text-red-500' },
  { href: '/dashboard', match: '/dashboard', label: 'Home', icon: LayoutDashboard, color: 'text-emerald-600', center: true },
  { href: '/accounts', match: '/accounts', label: 'Cuentas', icon: CreditCard, color: 'text-blue-500' },
  { href: '/settings', match: '/settings', label: 'Ajustes', icon: Settings, color: 'text-gray-500' },
]

export function MobileNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentType = searchParams.get('type')

  function isActive(item: typeof navItems[0]) {
    if (item.match.includes('?type=')) {
      const type = item.match.split('?type=')[1]
      return pathname === '/transactions' && currentType === type
    }
    return pathname === item.match || pathname.startsWith(item.match + '/')
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden">
      <div className="flex items-end justify-around px-2 py-1">
        {navItems.map((item) => {
          const active = isActive(item)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-0',
                item.center && 'relative -top-4 bg-gray-900 shadow-lg px-4 py-3 rounded-2xl',
                active && !item.center && 'opacity-100',
                !active && !item.center && 'opacity-50'
              )}
            >
              <Icon className={cn(
                'flex-shrink-0',
                item.center ? 'h-6 w-6 text-white' : 'h-5 w-5',
                !item.center && (active ? item.color : 'text-gray-400')
              )} />
              <span className={cn(
                'text-xs font-medium truncate',
                item.center ? 'text-white' : active ? item.color : 'text-gray-400'
              )}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
