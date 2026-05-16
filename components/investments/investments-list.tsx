'use client'

import { useState } from 'react'
import { Investment } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const INVESTMENT_TYPES = [
  { value: 'stock', label: '📈 Acciones' },
  { value: 'crypto', label: '₿ Criptomonedas' },
  { value: 'real_estate', label: '🏠 Inmuebles' },
  { value: 'fixed_income', label: '📊 Renta fija' },
  { value: 'other', label: '💼 Otro' },
]

interface Props {
  investments: Investment[]
  userId: string
}

export function InvestmentsList({ investments, userId }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'stock', initial_amount: '', current_value: '', currency: 'ARS', purchase_date: new Date().toISOString().split('T')[0], notes: '' })
  const router = useRouter()
  const supabase = createClient()

  const totalInvested = investments.reduce((s, i) => s + i.initial_amount, 0)
  const totalCurrent = investments.reduce((s, i) => s + i.current_value, 0)
  const totalGain = totalCurrent - totalInvested

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('investments').insert({
      user_id: userId,
      name: form.name,
      type: form.type,
      initial_amount: parseFloat(form.initial_amount),
      current_value: parseFloat(form.current_value || form.initial_amount),
      currency: form.currency,
      purchase_date: form.purchase_date,
      notes: form.notes || null,
    })
    if (error) toast.error('Error al crear la inversión')
    else { toast.success('Inversión registrada'); setOpen(false); router.refresh() }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('investments').delete().eq('id', id)
    if (error) toast.error('Error al eliminar')
    else { toast.success('Inversión eliminada'); router.refresh() }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Inversiones</h1>
        <Button onClick={() => setOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" /> Nueva inversión
        </Button>
      </div>

      {investments.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card><CardContent className="pt-4"><p className="text-xs text-gray-400">Invertido</p><p className="text-xl font-bold">{formatCurrency(totalInvested)}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-gray-400">Valor actual</p><p className="text-xl font-bold text-blue-600">{formatCurrency(totalCurrent)}</p></CardContent></Card>
          <Card><CardContent className="pt-4"><p className="text-xs text-gray-400">Ganancia/Pérdida</p><p className={`text-xl font-bold ${totalGain >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{totalGain >= 0 ? '+' : ''}{formatCurrency(totalGain)}</p></CardContent></Card>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {investments.length === 0 ? (
          <div className="col-span-full text-center text-gray-400 py-12">No tenés inversiones registradas. ¡Registrá tu primera!</div>
        ) : investments.map(inv => {
          const gain = inv.current_value - inv.initial_amount
          const pct = ((gain / inv.initial_amount) * 100).toFixed(2)
          const positive = gain >= 0
          return (
            <Card key={inv.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-sm font-medium">{inv.name}</CardTitle>
                  <Badge variant="secondary" className="text-xs mt-1">{INVESTMENT_TYPES.find(t => t.value === inv.type)?.label}</Badge>
                </div>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-500 h-7 w-7" onClick={() => handleDelete(inv.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Invertido</span>
                  <span>{formatCurrency(inv.initial_amount, inv.currency)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Valor actual</span>
                  <span className="font-semibold">{formatCurrency(inv.current_value, inv.currency)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Rendimiento</span>
                  <span className={`flex items-center gap-1 font-semibold ${positive ? 'text-emerald-600' : 'text-red-500'}`}>
                    {positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                    {positive ? '+' : ''}{pct}%
                  </span>
                </div>
                <p className="text-xs text-gray-400">{formatDate(inv.purchase_date)}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nueva inversión</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre del activo</Label>
              <Input placeholder="Ej: AAPL, Bitcoin, Departamento..." value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v ?? '' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{INVESTMENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Moneda</Label>
                <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v ?? '' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ARS">ARS</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Monto invertido</Label>
                <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.initial_amount} onChange={e => setForm({ ...form, initial_amount: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Valor actual</Label>
                <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.current_value} onChange={e => setForm({ ...form, current_value: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Fecha de compra</Label>
              <Input type="date" value={form.purchase_date} onChange={e => setForm({ ...form, purchase_date: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Input placeholder="Observaciones..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-700">{loading ? 'Guardando...' : 'Registrar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
