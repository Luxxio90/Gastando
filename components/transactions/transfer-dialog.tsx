'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Account, Responsible } from '@/types'
import { formatCurrency, todayLocalStr } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { ArrowLeftRight, ArrowDown } from 'lucide-react'

const TRANSFER_COLOR = '#3BB2F6'

interface Props {
  open: boolean
  onClose: () => void
  accounts: Account[]
  responsibles: Responsible[]
  userId: string
}

export function TransferDialog({ open, onClose, accounts, responsibles, userId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ from_id: '', to_id: '', amount: '', description: 'Transferencia', responsible_id: '' })

  const fromAccount  = accounts.find(a => a.id === form.from_id)
  const toAccount    = accounts.find(a => a.id === form.to_id)
  const amount       = parseFloat(form.amount) || 0
  const afterBalance = fromAccount ? fromAccount.balance - amount : 0
  const insufficient = !!fromAccount && amount > 0 && amount > fromAccount.balance

  async function getOrCreateCategory(type: 'income' | 'expense'): Promise<string | null> {
    const { data } = await supabase
      .from('categories').select('id')
      .eq('name', 'Transferencia').eq('type', type)
      .or(`user_id.eq.${userId},is_default.eq.true`).limit(1)

    if (data && data.length > 0) return data[0].id

    const { data: created, error } = await supabase
      .from('categories')
      .insert({ user_id: userId, name: 'Transferencia', icon: '🔄', color: '#6366f1', type, is_default: false, expense_type_id: null })
      .select('id').single()

    if (error) return null
    return created?.id ?? null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.from_id || !form.to_id) { toast.error('Seleccioná ambas cuentas'); return }
    if (form.from_id === form.to_id)  { toast.error('Las cuentas deben ser distintas'); return }
    if (amount <= 0)                  { toast.error('El monto debe ser mayor a 0'); return }
    if (insufficient)                 { toast.error('Saldo insuficiente en la cuenta origen'); return }

    setLoading(true)
    try {
      const [expenseCatId, incomeCatId] = await Promise.all([
        getOrCreateCategory('expense'),
        getOrCreateCategory('income'),
      ])

      if (!expenseCatId || !incomeCatId) { toast.error('Error al preparar categorías'); return }

      const today          = todayLocalStr()
      const desc           = form.description.trim() || 'Transferencia'
      const transferGroupId = crypto.randomUUID()

      const responsibleId = form.responsible_id || null
      const [r1, r2] = await Promise.all([
        supabase.from('transactions').insert({
          user_id: userId, account_id: form.from_id, category_id: expenseCatId,
          type: 'expense', amount, description: `${desc} a ${toAccount?.name}`, date: today, notes: null,
          transfer_group_id: transferGroupId, responsible_party_id: responsibleId,
        }),
        supabase.from('transactions').insert({
          user_id: userId, account_id: form.to_id, category_id: incomeCatId,
          type: 'income', amount, description: `${desc} desde ${fromAccount?.name}`, date: today, notes: null,
          transfer_group_id: transferGroupId, responsible_party_id: responsibleId,
        }),
      ])

      if (r1.error || r2.error) {
        toast.error('Error al realizar la transferencia')
      } else {
        await Promise.all([
          fromAccount ? supabase.from('accounts').update({ balance: fromAccount.balance - amount }).eq('id', form.from_id) : Promise.resolve(),
          toAccount   ? supabase.from('accounts').update({ balance: toAccount.balance   + amount }).eq('id', form.to_id)   : Promise.resolve(),
        ])
        toast.success(`${formatCurrency(amount)} transferido a ${toAccount?.name}`)
        setForm({ from_id: '', to_id: '', amount: '', description: 'Transferencia', responsible_id: '' })
        onClose()
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  const toAccounts = accounts.filter(a => a.id !== form.from_id)

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 border-border">
        {/* Header */}
        <div
          className="px-5 pt-5 pb-4 border-b border-border flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${TRANSFER_COLOR}18 0%, transparent 100%)` }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: TRANSFER_COLOR + '20' }}
            >
              <ArrowLeftRight className="h-4 w-4" style={{ color: TRANSFER_COLOR }} />
            </div>
            <DialogTitle className="text-base font-semibold text-foreground">
              Transferir entre cuentas
            </DialogTitle>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* Monto prominente */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Monto</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground/60">$</span>
              <Input
                type="number" min="0.01" step="0.01" placeholder="0.00"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                required
                className="pl-8 h-14 text-2xl font-bold bg-muted/40 border-border/60 tracking-tight"
                style={{ color: TRANSFER_COLOR }}
              />
            </div>
          </div>

          {/* Desde */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Desde</label>
            <div className="space-y-1.5">
              {accounts.map(a => {
                const active = form.from_id === a.id
                return (
                  <button
                    key={a.id} type="button"
                    onClick={() => setForm({ ...form, from_id: a.id, to_id: form.to_id === a.id ? '' : form.to_id })}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm transition-all text-left"
                    style={active
                      ? { backgroundColor: a.color + '18', borderColor: a.color + '55' }
                      : { backgroundColor: 'transparent', borderColor: 'hsl(var(--border))' }
                    }
                  >
                    <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate text-sm">{a.name}</p>
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        {formatCurrency(a.balance, a.currency)}
                      </p>
                    </div>
                    {active && (
                      <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Preview saldo post-transferencia */}
          {fromAccount && amount > 0 && (
            <div
              className="px-3 py-2.5 rounded-xl text-xs flex items-center justify-between"
              style={{
                backgroundColor: insufficient ? '#FF4D6D15' : TRANSFER_COLOR + '12',
                border: `1px solid ${insufficient ? '#FF4D6D35' : TRANSFER_COLOR + '30'}`,
              }}
            >
              <span className="text-muted-foreground">Saldo después de transferir</span>
              <span
                className="font-bold tabular-nums"
                style={{ color: insufficient ? '#FF4D6D' : 'hsl(var(--foreground))' }}
              >
                {formatCurrency(afterBalance, fromAccount.currency)}
              </span>
            </div>
          )}

          {/* Separador con flecha */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border/60" />
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: TRANSFER_COLOR + '15', border: `1px solid ${TRANSFER_COLOR}30` }}
            >
              <ArrowDown className="h-4 w-4" style={{ color: TRANSFER_COLOR }} />
            </div>
            <div className="flex-1 h-px bg-border/60" />
          </div>

          {/* Hacia */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Hacia</label>
            {toAccounts.length === 0 ? (
              <p className="text-xs text-muted-foreground bg-muted/40 border border-border p-2.5 rounded-lg">
                Seleccioná primero la cuenta de origen.
              </p>
            ) : (
              <div className="space-y-1.5">
                {toAccounts.map(a => {
                  const active = form.to_id === a.id
                  return (
                    <button
                      key={a.id} type="button"
                      onClick={() => setForm({ ...form, to_id: a.id })}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm transition-all text-left"
                      style={active
                        ? { backgroundColor: a.color + '18', borderColor: a.color + '55' }
                        : { backgroundColor: 'transparent', borderColor: 'hsl(var(--border))' }
                      }
                    >
                      <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate text-sm">{a.name}</p>
                        <p className="text-[11px] text-muted-foreground tabular-nums">
                          {formatCurrency(a.balance, a.currency)}
                        </p>
                      </div>
                      {active && (
                        <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Encargado */}
          {responsibles.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                Encargado <span className="normal-case font-normal text-muted-foreground/60">(opcional)</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {responsibles.map(r => {
                  const active = form.responsible_id === r.id
                  return (
                    <button
                      key={r.id} type="button"
                      onClick={() => setForm({ ...form, responsible_id: active ? '' : r.id })}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                      style={active
                        ? { backgroundColor: r.color + '20', borderColor: r.color + '60', color: r.color }
                        : { backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }
                      }
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
                      {r.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Descripción */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              Descripción <span className="normal-case font-normal text-muted-foreground/60">(opcional)</span>
            </label>
            <Input
              placeholder="Transferencia"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="bg-muted/40 border-border/60"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit" disabled={loading || insufficient}
              className="flex-1 font-semibold"
              style={{
                background: `linear-gradient(135deg, ${TRANSFER_COLOR} 0%, #60C8FF 100%)`,
                color: '#fff',
                border: 'none',
              }}
            >
              {loading ? 'Transfiriendo...' : 'Transferir'}
            </Button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  )
}
