'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Account, Category } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Props {
  open: boolean
  onClose: () => void
  accounts: Account[]
  categories: Category[]
  userId: string
  defaultType?: 'income' | 'expense'
}

export function TransactionDialog({ open, onClose, accounts, categories, userId, defaultType = 'expense' }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    type: defaultType as 'income' | 'expense',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    account_id: '',
    category_id: '',
    notes: '',
  })

  const filteredCategories = categories.filter(c => c.type === form.type)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.account_id || !form.category_id) {
      toast.error('Seleccioná una cuenta y una categoría')
      return
    }

    setLoading(true)
    const { error } = await supabase.from('transactions').insert({
      user_id: userId,
      type: form.type,
      amount: parseFloat(form.amount),
      description: form.description,
      date: form.date,
      account_id: form.account_id,
      category_id: form.category_id,
      notes: form.notes || null,
    })

    if (error) {
      toast.error('Error al guardar: ' + error.message)
    } else {
      toast.success('Transacción registrada')
      onClose()
      router.refresh()
      setForm({ type: 'expense', amount: '', description: '', date: new Date().toISOString().split('T')[0], account_id: '', category_id: '', notes: '' })
    }

    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva transacción</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            {(['expense', 'income'] as const).map(t => (
              <Button
                key={t}
                type="button"
                variant={form.type === t ? 'default' : 'outline'}
                className={`flex-1 ${form.type === t && t === 'expense' ? 'bg-red-500 hover:bg-red-600' : ''} ${form.type === t && t === 'income' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                onClick={() => setForm({ ...form, type: t, category_id: '' })}
              >
                {t === 'expense' ? 'Gasto' : 'Ingreso'}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <Label>Monto</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Input
              placeholder="Ej: Supermercado, Sueldo..."
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={form.date}
                onChange={e => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Cuenta</Label>
              <Select value={form.account_id} onValueChange={v => setForm({ ...form, account_id: v ?? '' })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Categoría</Label>
            <Select value={form.category_id} onValueChange={v => setForm({ ...form, category_id: v ?? '' })}>
              <SelectTrigger><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
              <SelectContent>
                {filteredCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notas (opcional)</Label>
            <Input
              placeholder="Observaciones..."
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
