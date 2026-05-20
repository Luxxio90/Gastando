'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Account, Category, Transaction } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { TrendingUp, TrendingDown } from 'lucide-react'

const INCOME_COLOR  = '#00CB96'
const EXPENSE_COLOR = '#FF4D6D'

interface Props {
  open: boolean
  onClose: () => void
  accounts: Account[]
  categories: Category[]
  userId: string
  defaultType?: 'income' | 'expense'
  defaultAccountId?: string
  editingTransaction?: Transaction | null
}

const emptyForm = (type: 'income' | 'expense', accountId: string) => ({
  type,
  amount: '',
  description: '',
  date: new Date().toISOString().split('T')[0],
  account_id: accountId,
  category_id: '',
  notes: '',
})

export function TransactionDialog({
  open, onClose, accounts, categories, userId,
  defaultType = 'expense', defaultAccountId = '',
  editingTransaction,
}: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(emptyForm(defaultType, defaultAccountId))

  useEffect(() => {
    if (editingTransaction) {
      setForm({
        type: editingTransaction.type,
        amount: editingTransaction.amount.toString(),
        description: editingTransaction.description,
        date: editingTransaction.date,
        account_id: editingTransaction.account_id,
        category_id: editingTransaction.category_id,
        notes: editingTransaction.notes ?? '',
      })
    } else {
      setForm(emptyForm(defaultType, defaultAccountId))
    }
  }, [editingTransaction, defaultType, defaultAccountId, open])

  const filteredCategories = categories.filter(c => c.type === form.type)
  const activeColor = form.type === 'income' ? INCOME_COLOR : EXPENSE_COLOR
  const isEditing   = !!editingTransaction

  async function updateBalance(accountId: string, delta: number) {
    const { data: acc } = await supabase.from('accounts').select('balance').eq('id', accountId).single()
    if (acc) await supabase.from('accounts').update({ balance: acc.balance + delta }).eq('id', accountId)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.account_id)  { toast.error('Seleccioná una cuenta');    return }
    if (!form.category_id) { toast.error('Seleccioná una categoría'); return }

    setLoading(true)
    const amount = parseFloat(form.amount)

    const payload = {
      user_id: userId,
      type: form.type,
      amount,
      description: form.description,
      date: form.date,
      account_id: form.account_id,
      category_id: form.category_id,
      notes: form.notes || null,
    }

    if (isEditing) {
      const { error } = await supabase.from('transactions').update(payload).eq('id', editingTransaction!.id)
      if (error) {
        toast.error('Error al guardar: ' + error.message)
      } else {
        const oldDelta = editingTransaction!.type === 'income' ? -editingTransaction!.amount : editingTransaction!.amount
        if (editingTransaction!.account_id === form.account_id) {
          const newDelta = form.type === 'income' ? amount : -amount
          await updateBalance(form.account_id, oldDelta + newDelta)
        } else {
          await updateBalance(editingTransaction!.account_id, oldDelta)
          const newDelta = form.type === 'income' ? amount : -amount
          await updateBalance(form.account_id, newDelta)
        }
        toast.success('Transacción actualizada')
        onClose()
        router.refresh()
      }
    } else {
      const { error } = await supabase.from('transactions').insert(payload)
      if (error) {
        toast.error('Error al guardar: ' + error.message)
      } else {
        const delta = form.type === 'income' ? amount : -amount
        await updateBalance(form.account_id, delta)
        toast.success('Transacción registrada')
        onClose()
        router.refresh()
      }
    }

    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 border-border">
        {/* Header */}
        <div
          className="px-5 pt-5 pb-4 border-b border-border flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${activeColor}18 0%, transparent 100%)` }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ backgroundColor: activeColor + '22' }}
            >
              {form.type === 'income'
                ? <TrendingUp  className="h-4 w-4" style={{ color: activeColor }} />
                : <TrendingDown className="h-4 w-4" style={{ color: activeColor }} />
              }
            </div>
            <DialogTitle className="text-base font-semibold text-foreground">
              {isEditing ? 'Editar transacción' : form.type === 'income' ? 'Nuevo ingreso' : 'Nuevo gasto'}
            </DialogTitle>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* Tipo */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              {(['expense', 'income'] as const).map(t => {
                const color  = t === 'income' ? INCOME_COLOR : EXPENSE_COLOR
                const active = form.type === t
                return (
                  <button
                    key={t} type="button"
                    onClick={() => setForm({ ...form, type: t, category_id: '' })}
                    className="py-2.5 rounded-xl text-sm font-bold border transition-all"
                    style={active
                      ? { backgroundColor: color + '20', borderColor: color + '60', color }
                      : { backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }
                    }
                  >
                    {t === 'income' ? '↑ Ingreso' : '↓ Gasto'}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Monto */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Monto</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground/60">$</span>
              <Input
                type="number" min="0" step="0.01" placeholder="0.00"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                required
                className="pl-8 h-14 text-2xl font-bold bg-muted/40 border-border/60 tracking-tight"
                style={{ color: activeColor }}
              />
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Descripción</label>
            <Input
              placeholder="Ej: Supermercado, Sueldo..."
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              required
              className="bg-muted/40 border-border/60"
            />
          </div>

          {/* Fecha */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Fecha</label>
            <Input
              type="date"
              value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
              required
              className="bg-muted/40 border-border/60"
            />
          </div>

          {/* Cuenta */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Cuenta</label>
            {accounts.length === 0 ? (
              <p className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 p-2.5 rounded-lg">
                No tenés cuentas. Creá una en la sección Cuentas.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {accounts.map(a => {
                  const active = form.account_id === a.id
                  return (
                    <button
                      key={a.id} type="button"
                      onClick={() => setForm({ ...form, account_id: a.id })}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all"
                      style={active
                        ? { backgroundColor: a.color + '20', borderColor: a.color + '60', color: 'hsl(var(--foreground))' }
                        : { backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }
                      }
                    >
                      <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />
                      {a.name}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Categoría */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Categoría</label>
            {filteredCategories.length === 0 ? (
              <p className="text-xs text-muted-foreground bg-muted/40 border border-border p-2.5 rounded-lg">
                No hay categorías para este tipo. Creá una en Ajustes → Categorías.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-0.5">
                {filteredCategories.map(c => {
                  const active = form.category_id === c.id
                  const color  = c.color || '#7C4DFF'
                  return (
                    <button
                      key={c.id} type="button"
                      onClick={() => setForm({ ...form, category_id: c.id })}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all text-left"
                      style={active
                        ? { backgroundColor: color + '20', borderColor: color + '60', color: 'hsl(var(--foreground))' }
                        : { backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }
                      }
                    >
                      <span className="text-base leading-none flex-shrink-0">{c.icon}</span>
                      <span className="truncate">{c.name}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              Notas <span className="normal-case font-normal text-muted-foreground/60">(opcional)</span>
            </label>
            <Input
              placeholder="Observaciones..."
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              className="bg-muted/40 border-border/60"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit" disabled={loading}
              className="flex-1 font-semibold"
              style={{
                background: `linear-gradient(135deg, ${activeColor} 0%, ${activeColor}cc 100%)`,
                color: '#fff',
                border: 'none',
              }}
            >
              {loading ? 'Guardando...' : isEditing ? 'Guardar' : 'Registrar'}
            </Button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  )
}
