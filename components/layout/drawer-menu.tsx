'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, BarChart2, Settings, ChevronRight, ArrowLeftRight } from 'lucide-react'

interface Props {
  userEmail?: string | null
}

const MENU_ITEMS = [
  {
    href: '/estadisticas',
    icon: BarChart2,
    label: 'Estadísticas',
    description: 'Gastos por categoría y tendencias',
    color: '#3BB2F6',
  },
  {
    href: '/transactions',
    icon: ArrowLeftRight,
    label: 'Transacciones',
    description: 'Historial de ingresos y gastos',
    color: '#00CB96',
  },
  {
    href: '/settings',
    icon: Settings,
    label: 'Ajustes',
    description: 'Cuentas, categorías y más',
    color: '#7C4DFF',
  },
]

export function DrawerMenu({ userEmail }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        className="p-2 rounded-xl hover:bg-muted transition-colors"
        aria-label="Menú"
      >
        <Menu className="h-5 w-5 text-muted-foreground" />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className="fixed top-0 left-0 h-full z-50 flex flex-col bg-card border-r border-border shadow-2xl transition-transform duration-300 ease-in-out"
        style={{
          width: '65vw',
          maxWidth: 280,
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        {/* Header */}
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
              {userEmail && (
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{userEmail}</p>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground flex-shrink-0 mt-0.5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1.5">
          {MENU_ITEMS.map(({ href, icon: Icon, label, description, color }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/60 transition-colors group"
            >
              <div
                className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: color + '18' }}
              >
                <Icon className="h-4.5 w-4.5" style={{ color, width: 18, height: 18 }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-[10px] text-muted-foreground truncate">{description}</p>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0" />
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border flex-shrink-0">
          <p className="text-[10px] text-muted-foreground/50 text-center">Gastando v1.0</p>
        </div>
      </div>
    </>
  )
}
