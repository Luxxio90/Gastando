'use client'

import { useState } from 'react'
import { Account } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, Pencil, CreditCard } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const ACCOUNT_TYPES = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'bank', label: 'Cuenta bancaria' },
  { value: 'credit_card', label: 'Tarjeta de crédito' },
  { value: 'savings', label: 'Caja de ahorro' },
  { value: 'other', label: 'Otra' },
]

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

type FormState = { name: string; type: string; balance: string; currency: string; color: string }
const emptyForm: FormState = { name: '', type: 'bank', balance: '', currency: 'ARS', color: COLORS[0] }

interface Props {
  accounts: Account[]
  userId: string
}

export function AccountsList({ accounts, userId }: Props) {
  const [mode, setMode] = useState<'create' | 'edit' | null>(null)
  const [editing, setEditing] = useState<Account | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const router = useRouter()
  const supabase = createClient()

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0)

  function openCreate() {
    setForm(emptyForm)
    setEditing(null)
    setMode('create')
  }

  function openEdit(account: Account) {
    setForm({
      name: account.name,
      type: account.type,
      balance: account.balance.toString(),
      currency: account.currency,
      color: account.color,
    })
    setEditing(account)
    setMode('edit')
  }

  function closeDialog() {
    setMode(null)
    setEditing(null)
    setForm(emptyForm)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    if (mode === 'create') {
      const { error } = await supabase.from('accounts').insert({
        user_id: userId,
        name: form.name,
        type: form.type,
        balance: parseFloat(form.balance) || 0,
        currency: form.currency,
        color: form.color,
      })
      if (error) toast.error('Error al crear la cuenta')
      else { toast.success('Cuenta creada'); closeDialog(); router.refresh() }
    } else if (mode === 'edit' && editing) {
      const { error } = await supabase.from('accounts').update({
        name: form.name,
        type: form.type,
        balance: parseFloat(form.balance) || 0,
        currency: form.currency,
        color: form.color,
      }).eq('id', editing.id)
      if (error) toast.error('Error al guardar los cambios')
      else { toast.success('Cuenta actualizada'); closeDialog(); router.refresh() }
    }

    setLoading(false)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('accounts').delete().eq('id', id)
    if (error) toast.error('No se puede eliminar (tiene transacciones asociadas)')
    else { toast.success('Cuenta eliminada'); router.refresh() }
  }

  const AccountForm = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Nombre</Label>
        <Input placeholder="Ej: Banco Galicia, Efectivo..." value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select value={form.type} onValueChange={v => setForm({ ...form, type: v ?? '' })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ACCOUNT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Balance</Label>
          <Input type="number" step="0.01" placeholder="0.00" value={form.balance} onChange={e => setForm({ ...form, balance: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Moneda</Label>
          <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v ?? '' })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
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
              <button key={c} type="button" className={`h-6 w-6 rounded-full border-2 ${form.color === c ? 'border-gray-900' : 'border-transparent'}`} style={{ backgroundColor: c }} onClick={() => setForm({ ...form, color: c })} />
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={closeDialog}>Cancelar</Button>
        <Button type="submit" disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
          {loading ? 'Guardando...' : mode === 'edit' ? 'Guardar cambios' : 'Crear cuenta'}
        </Button>
      </div>
    </form>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cuentas</h1>
          <p className="text-gray-400 text-sm">Balance total: <span className="font-semibold text-gray-700">{formatCurrency(totalBalance)}</span></p>
        </div>
        <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" /> Nueva cuenta
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {accounts.length === 0 ? (
          <div className="col-span-full text-center text-gray-400 py-12">No tenés cuentas aún. ¡Creá una!</div>
        ) : accounts.map(a => (
          <Card key={a.id} className="relative overflow-hidden">
            <div className="h-1.5" style={{ backgroundColor: a.color }} />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-gray-500" />
                <CardTitle className="text-sm font-medium">{a.name}</CardTitle>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-blue-500 h-7 w-7" onClick={() => openEdit(a)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-500 h-7 w-7" onClick={() => handleDelete(a.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(a.balance, a.currency)}</p>
              <p className="text-xs text-gray-400 mt-1">{ACCOUNT_TYPES.find(t => t.value === a.type)?.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={mode !== null} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{mode === 'edit' ? 'Editar cuenta' : 'Nueva cuenta'}</DialogTitle>
          </DialogHeader>
          {AccountForm}
        </DialogContent>
      </Dialog>
    </div>
  )
}
