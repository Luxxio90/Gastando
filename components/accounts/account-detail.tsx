'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Account, Transaction, Category } from '@/types'
import { formatCurrency, formatDate, todayLocalStr } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  ArrowLeft, ArrowRight, MoreVertical, Plus, Pencil,
  Wallet, Landmark, CreditCard, PiggyBank, Banknote,
  TrendingUp, TrendingDown, Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
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
  { value: 'cash',        label: 'Efectivo',           icon: Wallet },
  { value: 'bank',        label: 'Cuenta bancaria',    icon: Landmark },
  { value: 'credit_card', label: 'Tarjeta de crédito', icon: CreditCard },
  { value: 'savings',     label: 'Caja de ahorro',     icon: PiggyBank },
  { value: 'other',       label: 'Otra',               icon: Banknote },
]

const COLORS = ['#7C4DFF', '#00CB96', '#3BB2F6', '#FF4D6D', '#F59E0B', '#EC4899', '#10b981', '#f97316']

function computeRunningBalances(transactions: Transaction[], currentBalance: number) {
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime()
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
  const router   = useRouter()
  const supabase = createClient()
  const [dialogOpen, setDialogOpen]         = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [editAccountOpen, setEditAccountOpen]       = useState(false)
  const [editLoading, setEditLoading]               = useState(false)
  const [editForm, setEditForm] = useState({
    name: account.name, type: account.type,
    balance: account.balance.toString(), currency: account.currency, color: account.color,
  })

  const withBalances  = computeRunningBalances(transactions, account.balance)
  const totalIncome   = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense  = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const TypeIcon = ACCOUNT_TYPES.find(t => t.value === account.type)?.icon ?? Banknote
  const typeLabel = ACCOUNT_TYPES.find(t => t.value === account.type)?.label ?? ''

  async function handleDeleteTransaction(id: string) {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Transacción eliminada')
    router.refresh()
  }

  async function handleSaveAccount(e: React.FormEvent) {
    e.preventDefault(); setEditLoading(true)
    const newBalance = parseFloat(editForm.balance) || 0
    const diff = newBalance - account.balance
    const { error } = await supabase.from('accounts').update({
      name: editForm.name, type: editForm.type,
      balance: newBalance, currency: editForm.currency, color: editForm.color,
    }).eq('id', account.id)
    if (error) { toast.error('Error al guardar los cambios'); setEditLoading(false); return }

    if (diff !== 0) {
      const adjType = diff > 0 ? 'income' : 'expense'
      const { data: cats } = await supabase.from('categories').select('id')
        .eq('name', 'Ajuste de saldo').eq('type', adjType)
        .or(`user_id.eq.${userId},is_default.eq.true`).limit(1)
      let catId: string | null = cats?.[0]?.id ?? null
      if (!catId) {
        const { data: newCat } = await supabase.from('categories').insert({
          user_id: userId, name: 'Ajuste de saldo', icon: '⚖️', color: '#F59E0B', type: adjType, is_default: false,
        }).select('id').single()
        catId = newCat?.id ?? null
      }
      if (catId) {
        await supabase.from('transactions').insert({
          user_id: userId, account_id: account.id, category_id: catId,
          type: adjType, amount: Math.abs(diff),
          description: 'Ajuste de saldo',
          date: todayLocalStr(), notes: null,
        })
      }
    }

    toast.success('Cuenta actualizada'); setEditAccountOpen(false); router.refresh()
    setEditLoading(false)
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Link href="/accounts">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-foreground truncate">{account.name}</h1>
          <p className="text-xs text-muted-foreground">{typeLabel}</p>
        </div>
        <Button
          variant="ghost" size="icon" className="h-8 w-8"
          onClick={() => { setEditForm({ name: account.name, type: account.type, balance: account.balance.toString(), currency: account.currency, color: account.color }); setEditAccountOpen(true) }}
        >
          <Pencil className="h-4 w-4 text-muted-foreground" />
        </Button>
        <Button
          onClick={() => { setEditingTransaction(null); setDialogOpen(true) }}
          size="sm"
          className="font-semibold"
          style={{ background: 'linear-gradient(135deg, #7C4DFF 0%, #9C6DFF 100%)', color: '#fff', border: 'none' }}
        >
          <Plus className="h-4 w-4 mr-1" /> Nuevo
        </Button>
      </div>

      {/* Tarjeta de saldo — color de la cuenta con gradiente */}
      <div
        className="rounded-2xl p-5 relative overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${account.color} 0%, ${account.color}bb 100%)` }}
      >
        {/* Decorative circles */}
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute right-10 top-8 h-16 w-16 rounded-full bg-white/10 pointer-events-none" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-white/20">
              <TypeIcon className="h-4 w-4 text-white" />
            </div>
            <span className="text-[10px] font-semibold text-white/70 uppercase tracking-widest">Saldo actual</span>
          </div>
          <p className="text-3xl font-bold text-white tabular-nums">{formatCurrency(account.balance, account.currency)}</p>

          <div className="flex gap-5 mt-4 pt-4 border-t border-white/20">
            <div>
              <p className="text-[10px] font-semibold text-white/60 uppercase tracking-wide">Ingresos</p>
              <p className="font-bold text-sm tabular-nums mt-0.5 text-white">
                +{formatCurrency(totalIncome, account.currency)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-white/60 uppercase tracking-wide">Gastos</p>
              <p className="font-bold text-sm tabular-nums mt-0.5 text-white">
                -{formatCurrency(totalExpense, account.currency)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Movimientos */}
      <div className="space-y-2">
        <h2 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-1">Movimientos</h2>

        {withBalances.length === 0 ? (
          <div className="text-center text-muted-foreground py-12 text-sm border border-dashed border-border rounded-xl">
            No hay movimientos en esta cuenta
          </div>
        ) : (() => {
          const groups: Record<string, typeof withBalances> = {}
          for (const t of withBalances) {
            if (!groups[t.date]) groups[t.date] = []
            groups[t.date].push(t)
          }
          const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a))

          return (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {sortedDates.map(date => (
                <div key={date}>
                  <div className="px-4 py-2 bg-muted/40 border-b border-border/40 sticky top-0 z-10">
                    <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                      {formatDate(date)}
                    </span>
                  </div>
                  <div className="divide-y divide-border/50">
                    {groups[date].map(t => {
                      const isIncome = t.type === 'income'
                      const color    = isIncome ? '#00CB96' : '#FF4D6D'
                      const TxIcon   = isIncome ? TrendingUp : TrendingDown
                      return (
                        <div key={t.id} className="p-3.5">
                          <div className="flex items-start gap-3">
                            <div
                              className="mt-0.5 h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: color + '18' }}
                            >
                              <TxIcon className="h-4 w-4" style={{ color }} />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-semibold text-sm text-foreground truncate">{t.description}</p>
                                  {t.category && (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {t.category.icon} {t.category.name}
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <span className="font-bold text-sm tabular-nums" style={{ color }}>
                                    {isIncome ? '+' : '-'}{formatCurrency(t.amount, account.currency)}
                                  </span>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger className="p-1 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-muted/60 transition-colors">
                                      <MoreVertical className="h-3.5 w-3.5" />
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => { setEditingTransaction(t); setDialogOpen(true) }}>Editar</DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem className="text-red-500" onClick={() => handleDeleteTransaction(t.id)}>Eliminar</DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                                <span className="tabular-nums">{formatCurrency(t._before, account.currency)}</span>
                                <ArrowRight className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />
                                <span className="tabular-nums font-semibold" style={{ color }}>{formatCurrency(t._after, account.currency)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )
        })()}
      </div>

      {/* Dialog editar cuenta */}
      <Dialog open={editAccountOpen} onOpenChange={setEditAccountOpen}>
        <DialogContent className="sm:max-w-md p-0 gap-0 border-border">
          <div
            className="px-5 pt-5 pb-4 border-b border-border"
            style={{ background: 'linear-gradient(135deg, #7C4DFF18 0%, #3BB2F608 100%)' }}
          >
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#7C4DFF20' }}>
                <Pencil className="h-4 w-4" style={{ color: '#7C4DFF' }} />
              </div>
              <DialogTitle className="text-base font-semibold">Editar cuenta</DialogTitle>
            </div>
          </div>

          <form onSubmit={handleSaveAccount} className="p-5 space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Nombre</label>
              <Input
                value={editForm.name}
                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                required
                className="bg-muted/40 border-border/60"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Tipo</label>
                <Select value={editForm.type} onValueChange={v => setEditForm({ ...editForm, type: v as Account['type'] })}>
                  <SelectTrigger className="w-full bg-muted/40 border-border/60">
                    <span className="text-sm">{ACCOUNT_TYPES.find(t => t.value === editForm.type)?.label ?? 'Seleccionar'}</span>
                  </SelectTrigger>
                  <SelectContent>{ACCOUNT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Nuevo saldo</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input
                    type="number" step="0.01"
                    value={editForm.balance}
                    onChange={e => setEditForm({ ...editForm, balance: e.target.value })}
                    className="pl-6 bg-muted/40 border-border/60 font-semibold"
                  />
                </div>
                {(() => {
                  const diff = (parseFloat(editForm.balance) || 0) - account.balance
                  if (diff === 0) return null
                  return (
                    <p className="text-[11px] font-medium" style={{ color: diff > 0 ? '#00CB96' : '#FF4D6D' }}>
                      Se generará un ajuste de {diff > 0 ? '+' : ''}{formatCurrency(diff, account.currency)}
                    </p>
                  )
                })()}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Moneda</label>
                <Select value={editForm.currency} onValueChange={v => setEditForm({ ...editForm, currency: v ?? '' })}>
                  <SelectTrigger className="w-full bg-muted/40 border-border/60">
                    <span className="text-sm">{editForm.currency || 'Seleccionar'}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ARS">ARS (Peso)</SelectItem>
                    <SelectItem value="USD">USD (Dólar)</SelectItem>
                    <SelectItem value="EUR">EUR (Euro)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Color</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {COLORS.map(c => (
                    <button
                      key={c} type="button"
                      onClick={() => setEditForm({ ...editForm, color: c })}
                      className="h-6 w-6 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                      style={{ backgroundColor: c, boxShadow: editForm.color === c ? `0 0 0 2px hsl(var(--background)), 0 0 0 4px ${c}` : 'none' }}
                    >
                      {editForm.color === c && <Check className="h-3 w-3 text-white" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setEditAccountOpen(false)}>Cancelar</Button>
              <Button
                type="submit" disabled={editLoading}
                className="flex-1 font-semibold"
                style={{ background: 'linear-gradient(135deg, #7C4DFF 0%, #9C6DFF 100%)', color: '#fff', border: 'none' }}
              >
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
        responsibles={[]}
        userId={userId}
        defaultAccountId={account.id}
        editingTransaction={editingTransaction}
      />
    </div>
  )
}
