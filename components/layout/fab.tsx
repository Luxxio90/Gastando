'use client'

import { useState, useEffect } from 'react'
import { Plus, TrendingUp, TrendingDown, ArrowLeftRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { TransactionDialog } from '@/components/transactions/transaction-dialog'
import { TransferDialog } from '@/components/transactions/transfer-dialog'
import { Account, Category, Responsible } from '@/types'

const ACTIONS = [
  { type: 'income'   as const, label: 'Ingreso',    color: '#00CB96', Icon: TrendingUp },
  { type: 'expense'  as const, label: 'Gasto',      color: '#FF4D6D', Icon: TrendingDown },
  { type: 'transfer' as const, label: 'Transferir', color: '#3BB2F6', Icon: ArrowLeftRight },
]

export function FloatingActionButton({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false)
  const [dialogType, setDialogType] = useState<'income' | 'expense' | 'transfer' | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [responsibles, setResponsibles] = useState<Responsible[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [{ data: acc }, { data: cat }, { data: resp }] = await Promise.all([
        supabase.from('accounts').select('*').eq('user_id', userId),
        supabase.from('categories').select('*').or(`user_id.eq.${userId},is_default.eq.true`).order('name'),
        supabase.from('responsible_parties').select('*').eq('user_id', userId).order('name'),
      ])
      setAccounts(acc ?? [])
      setCategories(cat ?? [])
      setResponsibles(resp ?? [])
    }
    load()
  }, [userId])

  async function handleSelect(type: 'income' | 'expense' | 'transfer') {
    setOpen(false)
    const [{ data: acc }, { data: cat }, { data: resp }] = await Promise.all([
      supabase.from('accounts').select('*').eq('user_id', userId),
      supabase.from('categories').select('*').or(`user_id.eq.${userId},is_default.eq.true`).order('name'),
      supabase.from('responsible_parties').select('*').eq('user_id', userId).order('name'),
    ])
    setAccounts(acc ?? [])
    setCategories(cat ?? [])
    setResponsibles(resp ?? [])
    setDialogType(type)
  }

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setOpen(false)} />
      )}

      <div className="fixed right-4 z-50 flex flex-col items-end gap-3 md:hidden" style={{ pointerEvents: 'none', bottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
        {/* Speed dial */}
        <div className="flex flex-col items-end gap-2.5">
          {ACTIONS.map((action, i) => (
            <button
              key={action.type}
              onClick={() => handleSelect(action.type)}
              className="flex items-center gap-3 pr-1.5 pl-4 py-1.5 rounded-2xl border transition-all duration-200"
              style={{
                background: 'hsl(var(--card))',
                borderColor: action.color + '35',
                boxShadow: open ? `0 4px 24px ${action.color}25` : 'none',
                opacity: open ? 1 : 0,
                transform: open ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.9)',
                transitionDelay: open
                  ? `${i * 55}ms`
                  : `${(ACTIONS.length - 1 - i) * 30}ms`,
                pointerEvents: open ? 'auto' : 'none', // container is none, so 'auto' here re-enables
              }}
            >
              <span className="text-sm font-bold" style={{ color: action.color }}>
                {action.label}
              </span>
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${action.color} 0%, ${action.color}cc 100%)`,
                  boxShadow: `0 2px 10px ${action.color}50`,
                }}
              >
                <action.Icon className="h-4.5 w-4.5 text-white" strokeWidth={2.5} style={{ width: 18, height: 18 }} />
              </div>
            </button>
          ))}
        </div>

        {/* Botón principal */}
        <button
          onClick={() => setOpen(!open)}
          className="h-14 w-14 rounded-2xl shadow-xl flex items-center justify-center transition-all duration-300"
          style={{
            pointerEvents: 'auto',
            background: open
              ? 'hsl(var(--muted))'
              : 'linear-gradient(135deg, #7C4DFF 0%, #9C6DFF 100%)',
            boxShadow: open ? 'none' : '0 4px 28px #7C4DFF55',
            transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
          }}
        >
          <Plus
            strokeWidth={2.5}
            style={{ width: 24, height: 24, color: open ? 'hsl(var(--foreground))' : '#fff' }}
          />
        </button>
      </div>

      {(dialogType === 'income' || dialogType === 'expense') && (
        <TransactionDialog
          open={true}
          onClose={() => setDialogType(null)}
          accounts={accounts}
          categories={categories}
          responsibles={responsibles}
          userId={userId}
          defaultType={dialogType}
        />
      )}

      {dialogType === 'transfer' && (
        <TransferDialog
          open={true}
          onClose={() => setDialogType(null)}
          accounts={accounts}
          responsibles={responsibles}
          userId={userId}
        />
      )}
    </>
  )
}
