'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  ArrowLeftRight,
  PiggyBank,
  TrendingUp,
  CreditCard,
  LogOut,
  Wallet,
  Menu,
  X,
} from 'lucide-react'
import { toast } from 'sonner'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transacciones', icon: ArrowLeftRight },
  { href: '/accounts', label: 'Cuentas', icon: CreditCard },
  { href: '/budgets', label: 'Presupuestos', icon: PiggyBank },
  { href: '/investments', label: 'Inversiones', icon: TrendingUp },
]

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    toast.success('Sesión cerrada')
    router.push('/auth/login')
    router.refresh()
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500 p-2 rounded-lg">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold">Gastando</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white md:hidden">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname === href || pathname.startsWith(href + '/')
                ? 'bg-emerald-600 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-3" />
          Cerrar sesión
        </Button>
      </div>
    </div>
  )
}

export function Sidebar() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Botón hamburguesa — solo en mobile */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-40 md:hidden bg-gray-900 text-white p-2 rounded-lg shadow-lg"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Overlay — solo en mobile cuando está abierto */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar mobile (drawer) */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white transform transition-transform duration-300 md:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarContent onClose={() => setOpen(false)} />
      </aside>

      {/* Sidebar desktop (siempre visible) */}
      <aside className="hidden md:flex w-64 min-h-screen bg-gray-900 text-white flex-col">
        <SidebarContent />
      </aside>
    </>
  )
}
