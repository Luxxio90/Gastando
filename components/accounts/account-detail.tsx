'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Account, Transaction, Category } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, ArrowUpCircle, ArrowDownCircle, MoreVertical, Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
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

const ACCOUNT_TYPES = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'bank', label: 'Cuenta bancaria' },
  { value: 'credit_card', label: 'Tarjeta de crédito' },
  { value: 'savings', label: 'Caja de ahorro' },
  { value: 'other', label: 'Otra' },
]

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

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
  const [editAccountOpen, setEditAccountOpen] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editForm, setEditForm] = useState({
    name: account.name,
    type: account.type,
    balance: account.balance.toString(),
    currency: account.currency,
    color: account.color,
  })

  const withBalances = computeRunningBalances(transactions, account.balance)

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  async function handleDeleteTransaction(id: string) {
    const t = transactions.find(tx => tx.id === id)
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) {
      toast.error('Error al eliminar')
    } else {
      if (t) {
        const { data: acc } = await supabase.from('accounts').select('balance').eq('id', account.id).single()
        if (acc) {
          const delta = t.type === 'income' ? -t.amount : t.amount
          await supabase.from('accounts').update({ balance: acc.balance + delta }).eq('id', account.id)
        }
      }
      toast.success('Transacción eliminada')
      router.refresh()
    }
  }

  async function handleSaveAccount(e: React.FormEvent) {
    e.preventDefault()
    setEditLoading(true)
    const { error } = await supabase
      .from('accounts')
      .update({
        name: editForm.name,
        type: editForm.type,
        balance: parseFloat(editForm.balance) || 0,
        currency: editForm.currency,
        color: editForm.color,
      })
      .eq('id', account.id)
    if (error) {
      toast.error('Error al guardar los cambios')
    } else {
      toast.success('Cuenta actualizada')
      setEditAccountOpen(false)
      router.refresh()
    }
    setEditLoading(false)
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
          <p className="text-xs text-gray-400">{ACCOUNT_TYPES.find(t => t.value === account.type)?.label}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditForm({ name: account.name, type: account.type, balance: account.balance.toString(), currency: account.currency, color: account.color }); setEditAccountOpen(true) }}>
          <Pencil className="h-4 w-4 text-gray-500" />
        </Button>
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
                  <div className={`mt-0.5 p-2 rounded-full flex-shrink-0 ${t.type === 'income' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    {t.type === 'income'
                      ? <ArrowUpCircle className="h-4 w-4 text-emerald-600" />
                      : <ArrowDownCircle className="h-4 w-4 text-red-500" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">{t.description}</p>
                        <p className="text-xs text-gray-400">{formatDate(t.date)} · {t.category?.icon} {t.category?.name}</p>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger className="flex-shrink-0 p-1.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                          <MoreVertical className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(t)}>Editar</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteTransaction(t.id)}>Eliminar</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

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

      {/* Dialog editar cuenta */}
      <Dialog open={editAccountOpen} onOpenChange={setEditAccountOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Editar cuenta</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveAccount} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={editForm.type} onValueChange={v => setEditForm({ ...editForm, type: v as Account['type'] })}>
                  <SelectTrigger className="w-full">
                    <span className="text-sm">{ACCOUNT_TYPES.find(t => t.value === editForm.type)?.label ?? 'Seleccionar'}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Balance</Label>
                <Input type="number" step="0.01" value={editForm.balance} onChange={e => setEditForm({ ...editForm, balance: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Moneda</Label>
                <Select value={editForm.currency} onValueChange={v => setEditForm({ ...editForm, currency: v ?? '' })}>
                  <SelectTrigger className="w-full">
                    <span className="text-sm">{editForm.currency || 'Seleccionar'}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ARS">ARS (Peso)</SelectItem>
                    <SelectItem value="USD">USD (Dólar)</SelectItem>
                    <SelectItem value="EUR">EUR (Euro)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2 pt-1">
                  {COLORS.map(c => (
                    <button key={c} type="button" className={`h-6 w-6 rounded-full border-2 ${editForm.color === c ? 'border-gray-900' : 'border-transparent'}`} style={{ backgroundColor: c }} onClick={() => setEditForm({ ...editForm, color: c })} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setEditAccountOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={editLoading} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                {editLoading ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de transacción */}
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
