'use client'

import { useState, useEffect } from 'react'
import { Plus, X, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { TransactionDialog } from '@/components/transactions/transaction-dialog'
import { Account, Category } from '@/types'

export function FloatingActionButton({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false)
  const [dialogType, setDialogType] = useState<'income' | 'expense' | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [{ data: acc }, { data: cat }] = await Promise.all([
        supabase.from('accounts').select('*').eq('user_id', userId),
        supabase.from('categories').select('*').or(`user_id.eq.${userId},is_default.eq.true`).order('name'),
      ])
      setAccounts(acc ?? [])
      setCategories(cat ?? [])
    }
    load()
  }, [userId])

  function handleSelect(type: 'income' | 'expense') {
    setOpen(false)
    setDialogType(type)
  }

  return (
    <>
      {/* Overlay para cerrar el speed dial */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setOpen(false)} />
      )}

      <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-3 md:hidden">
        {/* Speed dial opciones */}
        <div className={cn(
          'flex flex-col items-end gap-2 transition-all duration-200',
          open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
        )}>
          {/* Ingreso */}
          <button
            onClick={() => handleSelect('income')}
            className="flex items-center gap-2 bg-white shadow-lg rounded-full pl-4 pr-4 py-2.5 border border-emerald-100"
          >
            <span className="text-sm font-semibold text-emerald-700">Ingreso</span>
            <div className="bg-emerald-500 rounded-full p-1.5">
              <ArrowUpCircle className="h-4 w-4 text-white" />
            </div>
          </button>

          {/* Gasto */}
          <button
            onClick={() => handleSelect('expense')}
            className="flex items-center gap-2 bg-white shadow-lg rounded-full pl-4 pr-4 py-2.5 border border-red-100"
          >
            <span className="text-sm font-semibold text-red-600">Gasto</span>
            <div className="bg-red-500 rounded-full p-1.5">
              <ArrowDownCircle className="h-4 w-4 text-white" />
            </div>
          </button>
        </div>

        {/* Botón principal + */}
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            'h-14 w-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-200',
            open ? 'bg-gray-700 rotate-45' : 'bg-emerald-600 rotate-0'
          )}
        >
          {open
            ? <X className="h-6 w-6 text-white" />
            : <Plus className="h-6 w-6 text-white" />
          }
        </button>
      </div>

      {/* Dialog de transacción */}
      {dialogType && (
        <TransactionDialog
          open={true}
          onClose={() => setDialogType(null)}
          accounts={accounts}
          categories={categories}
          userId={userId}
          defaultType={dialogType}
        />
      )}
    </>
  )
}
