'use client'

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
  Settings,
  Bell,
} from 'lucide-react'
import { toast } from 'sonner'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/transactions', label: 'Transacciones', icon: ArrowLeftRight },
  { href: '/accounts', label: 'Cuentas', icon: CreditCard },
  { href: '/budgets', label: 'Presupuestos', icon: PiggyBank },
  { href: '/investments', label: 'Inversiones', icon: TrendingUp },
  { href: '/avisos', label: 'Avisos', icon: Bell },
  { href: '/settings', label: 'Ajustes', icon: Settings },
]

export function Sidebar() {
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
    <aside className="hidden md:flex w-64 min-h-screen bg-gray-900 text-white flex-col">
      <div className="p-6 flex items-center gap-3 border-b border-gray-700">
        <div className="bg-emerald-500 p-2 rounded-lg">
          <Wallet className="h-5 w-5 text-white" />
        </div>
        <span className="text-xl font-bold">Gastando</span>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
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
    </aside>
  )
}
