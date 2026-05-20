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
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
      <div className="bg-card/85 backdrop-blur-xl border-t border-border shadow-[0_-1px_20px_rgba(0,0,0,0.3)]">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map(({ href, label, icon: Icon, center }) => {
            const active = pathname === href || pathname.startsWith(href + '/')

            if (center) {
              return (
                <Link key={href} href={href} className="flex flex-col items-center gap-1">
                  <div className={cn(
                    'h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-lg',
                    active
                      ? 'bg-primary shadow-primary/40 scale-105'
                      : 'bg-primary/85 shadow-primary/20'
                  )}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <span className={cn(
                    'text-[10px] font-medium transition-colors',
                    active ? 'text-primary' : 'text-muted-foreground'
                  )}>
                    {label}
                  </span>
                </Link>
              )
            }

            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-1 px-3 py-1"
              >
                <div className={cn(
                  'p-2 rounded-xl transition-all duration-200',
                  active ? 'bg-primary/15' : ''
                )}>
                  <Icon className={cn(
                    'h-5 w-5 transition-colors',
                    active ? 'text-primary' : 'text-muted-foreground'
                  )} />
                </div>
                <span className={cn(
                  'text-[10px] font-medium transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
