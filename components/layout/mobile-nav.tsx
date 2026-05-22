'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  ArrowLeftRight, BarChart2, Bell, ChevronRight, CreditCard,
  LayoutDashboard, LogOut, Menu, PiggyBank, Settings, Wallet, X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Props {
  userEmail?: string | null
}

const NAV_ITEMS = [
  { href: '/transactions', label: 'Transacciones', icon: ArrowLeftRight },
  { href: '/accounts',     label: 'Cuentas',       icon: CreditCard },
  { href: '/dashboard',    label: 'Inicio',         icon: LayoutDashboard, center: true },
  { href: '/budgets',      label: 'Distribución',   icon: PiggyBank },
]

const DRAWER_ITEMS = [
  { href: '/estadisticas', icon: BarChart2,  label: 'Estadísticas', description: 'Gastos por categoría y tendencias', color: '#3BB2F6' },
  { href: '/tarjetas',     icon: Wallet,     label: 'Tarjetas',     description: 'Resumen de tarjetas de crédito',    color: '#FF4D6D' },
  { href: '/avisos',       icon: Bell,       label: 'Avisos',       description: 'Vencimientos próximos',             color: '#F59E0B' },
  { href: '/settings',     icon: Settings,   label: 'Ajustes',      description: 'Cuentas, categorías y más',         color: '#7C4DFF' },
]

export function MobileNav({ userEmail }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const pathname  = usePathname()
  const router    = useRouter()
  const supabase  = createClient()

  async function handleLogout() {
    setDrawerOpen(false)
    await supabase.auth.signOut()
    toast.success('Sesión cerrada')
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <>
      {/* Backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className="fixed top-0 left-0 h-full z-50 flex flex-col bg-card border-r border-border shadow-2xl transition-transform duration-300 ease-in-out md:hidden"
        style={{ width: '65vw', maxWidth: 280, transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        <div
          className="px-5 pt-12 pb-5 border-b border-border flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #7C4DFF12 0%, transparent 100%)' }}
        >
          <div className="flex items-start justify-between">
            <div className="min-w-0">
              <div
                className="h-10 w-10 rounded-2xl flex items-center justify-center mb-3 text-base font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #7C4DFF 0%, #9C6DFF 100%)' }}
              >
                {userEmail ? userEmail[0].toUpperCase() : 'G'}
              </div>
              <p className="text-sm font-semibold text-foreground">Mi cuenta</p>
              {userEmail && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{userEmail}</p>}
            </div>
            <button
              onClick={() => setDrawerOpen(false)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground flex-shrink-0 mt-0.5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1.5">
          {DRAWER_ITEMS.map(({ href, icon: Icon, label, description, color }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setDrawerOpen(false)}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/60 transition-colors"
            >
              <div
                className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: color + '18' }}
              >
                <Icon style={{ color, width: 18, height: 18 }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-[10px] text-muted-foreground truncate">{description}</p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0" />
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-border flex-shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/60 transition-colors"
          >
            <LogOut className="h-4 w-4 text-red-500" />
            <span className="text-sm font-semibold text-red-500">Cerrar sesión</span>
          </button>
          <p className="text-[10px] text-muted-foreground/50 text-center mt-3">Gastando v1.0</p>
        </div>
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden">
        <div className="bg-card/85 backdrop-blur-xl border-t border-border shadow-[0_-1px_20px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-around px-2 py-2">
            {NAV_ITEMS.map(({ href, label, icon: Icon, center }) => {
              const active = pathname === href || pathname.startsWith(href + '/')
              if (center) {
                return (
                  <Link key={href} href={href} className="flex flex-col items-center gap-1">
                    <div className={cn(
                      'h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-lg',
                      active ? 'bg-primary shadow-primary/40 scale-105' : 'bg-primary/85 shadow-primary/20'
                    )}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <span className={cn('text-[10px] font-medium transition-colors', active ? 'text-primary' : 'text-muted-foreground')}>
                      {label}
                    </span>
                  </Link>
                )
              }
              return (
                <Link key={href} href={href} className="flex flex-col items-center gap-1 px-3 py-1">
                  <div className={cn('p-2 rounded-xl transition-all duration-200', active ? 'bg-primary/15' : '')}>
                    <Icon className={cn('h-5 w-5 transition-colors', active ? 'text-primary' : 'text-muted-foreground')} />
                  </div>
                  <span className={cn('text-[10px] font-medium transition-colors', active ? 'text-primary' : 'text-muted-foreground')}>
                    {label}
                  </span>
                </Link>
              )
            })}

            {/* Menú — opens drawer */}
            <button onClick={() => setDrawerOpen(true)} className="flex flex-col items-center gap-1 px-3 py-1">
              <div className={cn('p-2 rounded-xl transition-all duration-200', drawerOpen ? 'bg-primary/15' : '')}>
                <Menu className={cn('h-5 w-5 transition-colors', drawerOpen ? 'text-primary' : 'text-muted-foreground')} />
              </div>
              <span className={cn('text-[10px] font-medium transition-colors', drawerOpen ? 'text-primary' : 'text-muted-foreground')}>
                Menú
              </span>
            </button>
          </div>
        </div>
      </nav>
    </>
  )
}
