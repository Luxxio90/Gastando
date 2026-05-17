'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Account } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  accounts: Account[]
  userId: string
}

export function TransferDialog({ open, onClose, accounts, userId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ from_id: '', to_id: '', amount: '', description: 'Transferencia' })

  const fromAccount = accounts.find(a => a.id === form.from_id)
  const toAccount = accounts.find(a => a.id === form.to_id)
  const amount = parseFloat(form.amount) || 0

  async function getOrCreateCategory(type: 'income' | 'expense'): Promise<string | null> {
    const { data } = await supabase
      .from('categories')
      .select('id')
      .eq('name', 'Transferencia')
      .eq('type', type)
      .or(`user_id.eq.${userId},is_default.eq.true`)
      .limit(1)

    if (data && data.length > 0) return data[0].id

    const { data: created, error } = await supabase
      .from('categories')
      .insert({ user_id: userId, name: 'Transferencia', icon: '🔄', color: '#6366f1', type, is_default: false, expense_type_id: null })
      .select('id')
      .single()

    if (error) return null
    return created?.id ?? null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.from_id || !form.to_id) { toast.error('Seleccioná ambas cuentas'); return }
    if (form.from_id === form.to_id) { toast.error('Las cuentas deben ser distintas'); return }
    if (amount <= 0) { toast.error('El monto debe ser mayor a 0'); return }
    if (fromAccount && amount > fromAccount.balance) { toast.error('Saldo insuficiente en la cuenta origen'); return }

    setLoading(true)
    try {
      const [{ data: srcAcc }, { data: dstAcc }] = await Promise.all([
        supabase.from('accounts').select('balance').eq('id', form.from_id).single(),
        supabase.from('accounts').select('balance').eq('id', form.to_id).single(),
      ])

      if (!srcAcc || !dstAcc) { toast.error('Error al obtener saldos'); return }

      const [expenseCatId, incomeCatId] = await Promise.all([
        getOrCreateCategory('expense'),
        getOrCreateCategory('income'),
      ])

      if (!expenseCatId || !incomeCatId) { toast.error('Error al preparar categorías'); return }

      const today = new Date().toISOString().split('T')[0]
      const desc = form.description.trim() || 'Transferencia'

      const [r1, r2, r3, r4] = await Promise.all([
        supabase.from('transactions').insert({
          user_id: userId, account_id: form.from_id, category_id: expenseCatId,
          type: 'expense', amount, description: `${desc} → ${toAccount?.name}`, date: today, notes: null,
        }),
        supabase.from('transactions').insert({
          user_id: userId, account_id: form.to_id, category_id: incomeCatId,
          type: 'income', amount, description: `${desc} ← ${fromAccount?.name}`, date: today, notes: null,
        }),
        supabase.from('accounts').update({ balance: srcAcc.balance - amount }).eq('id', form.from_id),
        supabase.from('accounts').update({ balance: dstAcc.balance + amount }).eq('id', form.to_id),
      ])

      if (r1.error || r2.error || r3.error || r4.error) {
        toast.error('Error al realizar la transferencia')
      } else {
        toast.success(`${formatCurrency(amount)} transferido a ${toAccount?.name}`)
        setForm({ from_id: '', to_id: '', amount: '', description: 'Transferencia' })
        onClose()
        router.refresh()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm bg-blue-50">
        <DialogHeader>
          <DialogTitle>Transferir entre cuentas</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Cuenta origen */}
          <div className="space-y-2">
            <Label>Cuenta origen</Label>
            <Select value={form.from_id} onValueChange={v => setForm({ ...form, from_id: v ?? '', to_id: form.to_id === v ? '' : form.to_id })}>
              <SelectTrigger className="w-full bg-white">
                <span className={form.from_id ? 'text-sm' : 'text-sm text-muted-foreground'}>
                  {fromAccount ? `${fromAccount.name} · ${formatCurrency(fromAccount.balance, fromAccount.currency)}` : 'Seleccionar'}
                </span>
              </SelectTrigger>
              <SelectContent>
                {accounts.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} · {formatCurrency(a.balance, a.currency)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Flecha indicadora */}
          <div className="flex justify-center">
            <div className="bg-blue-100 rounded-full p-2">
              <ArrowRight className="h-4 w-4 text-blue-500" />
            </div>
          </div>

          {/* Cuenta destino */}
          <div className="space-y-2">
            <Label>Cuenta destino</Label>
            <Select value={form.to_id} onValueChange={v => setForm({ ...form, to_id: v ?? '' })}>
              <SelectTrigger className="w-full bg-white">
                <span className={form.to_id ? 'text-sm' : 'text-sm text-muted-foreground'}>
                  {toAccount ? `${toAccount.name} · ${formatCurrency(toAccount.balance, toAccount.currency)}` : 'Seleccionar'}
                </span>
              </SelectTrigger>
              <SelectContent>
                {accounts.filter(a => a.id !== form.from_id).map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} · {formatCurrency(a.balance, a.currency)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Monto */}
          <div className="space-y-2">
            <Label>Monto</Label>
            <Input type="number" min="0.01" step="0.01" placeholder="0.00" value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })} required className="bg-white" />
            {fromAccount && amount > 0 && (
              <p className="text-xs text-gray-400">
                Saldo después: <span className={amount > fromAccount.balance ? 'text-red-500 font-semibold' : 'text-gray-600 font-semibold'}>
                  {formatCurrency(fromAccount.balance - amount, fromAccount.currency)}
                </span>
              </p>
            )}
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label>Descripción <span className="text-gray-400 font-normal text-xs">(opcional)</span></Label>
            <Input placeholder="Transferencia" value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })} className="bg-white" />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1 bg-white" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700">
              {loading ? 'Transfiriendo...' : 'Transferir'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
