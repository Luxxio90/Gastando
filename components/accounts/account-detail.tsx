'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Account, Transaction, Category } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, ArrowUpCircle, ArrowDownCircle, MoreVertical, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { TransactionDialog } from '@/components/transactions/transaction-dialog'
import Link from 'next/link'

interface Props {
  account: Account
  transactions: Transaction[]
  categories: Category[]
  accounts: Account[]
  userId: string
}

function computeRunningBalances(transactions: Transaction[], currentBalance: number) {
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  let balance = currentBalance
  for (let i = sorted.length - 1; i >= 0; i--) {
    const t = sorted[i]
    const after = balance
    const before = t.type === 'income' ? balance - t.amount : balance + t.amount
    sorted[i] = { ...t, _before: before, _after: after } as Transaction & { _before: number; _after: number }
    balance = before
  }

  return sorted.reverse() as (Transaction & { _before: number; _after: number })[]
}

export function AccountDetail({ account, transactions, categories, accounts, userId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)

  const withBalances = computeRunningBalances(transactions, account.balance)

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  async function handleDeleteTransaction(id: string) {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) toast.error('Error al eliminar')
    else { toast.success('Transacción eliminada'); router.refresh() }
  }

  function handleEdit(t: Transaction) {
    setEditingTransaction(t)
    setDialogOpen(true)
  }

  function handleNewTransaction() {
    setEditingTransaction(null)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/accounts">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">{account.name}</h1>
          <p className="text-xs text-gray-400">{account.type === 'cash' ? 'Efectivo' : account.type === 'bank' ? 'Cuenta bancaria' : account.type === 'credit_card' ? 'Tarjeta de crédito' : account.type === 'savings' ? 'Caja de ahorro' : 'Otra'}</p>
        </div>
        <Button onClick={handleNewTransaction} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-1" /> Nuevo
        </Button>
      </div>

      {/* Tarjeta de saldo */}
      <div className="rounded-2xl p-5 text-white" style={{ backgroundColor: account.color }}>
        <p className="text-sm opacity-80">Saldo actual</p>
        <p className="text-3xl font-bold mt-1">{formatCurrency(account.balance, account.currency)}</p>
        <div className="flex gap-6 mt-4 text-sm">
          <div>
            <p className="opacity-70">↑ Ingresos</p>
            <p className="font-semibold">{formatCurrency(totalIncome, account.currency)}</p>
          </div>
          <div>
            <p className="opacity-70">↓ Gastos</p>
            <p className="font-semibold">{formatCurrency(totalExpense, account.currency)}</p>
          </div>
        </div>
      </div>

      {/* Lista de movimientos */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Movimientos</h2>

        {withBalances.length === 0 ? (
          <div className="text-center text-gray-400 py-12 text-sm">No hay movimientos en esta cuenta</div>
        ) : (
          <div className="space-y-2">
            {withBalances.map(t => (
              <div key={t.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-start gap-3">
                  {/* Ícono tipo */}
                  <div className={`mt-0.5 p-2 rounded-full flex-shrink-0 ${t.type === 'income' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    {t.type === 'income'
                      ? <ArrowUpCircle className="h-4 w-4 text-emerald-600" />
                      : <ArrowDownCircle className="h-4 w-4 text-red-500" />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">{t.description}</p>
                        <p className="text-xs text-gray-400">{formatDate(t.date)} · {t.category?.icon} {t.category?.name}</p>
                      </div>

                      {/* 3 puntos */}
                      <DropdownMenu>
                        <DropdownMenuTrigger className="flex-shrink-0 p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                          <MoreVertical className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(t)}>
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteTransaction(t.id)}>
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Saldo anterior → actual */}
                    <div className="flex items-center gap-1.5 mt-2 text-xs">
                      <span className="text-gray-400">{formatCurrency(t._before, account.currency)}</span>
                      <ArrowRight className="h-3 w-3 text-gray-300" />
                      <span className={`font-semibold ${t.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                        {formatCurrency(t._after, account.currency)}
                      </span>
                      <span className={`ml-1 ${t.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                        ({t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount, account.currency)})
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog de transacción (crear o editar) */}
      <TransactionDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditingTransaction(null) }}
        accounts={accounts}
        categories={categories}
        userId={userId}
        defaultAccountId={account.id}
        editingTransaction={editingTransaction}
      />
    </div>
  )
}
