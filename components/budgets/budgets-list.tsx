'use client'

import { useState } from 'react'
import { Budget, Category } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Props {
  budgets: (Budget & { spent: number })[]
  categories: Category[]
  userId: string
  month: number
  year: number
}

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export function BudgetsList({ budgets, categories, userId, month, year }: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ category_id: '', amount: '' })
  const router = useRouter()
  const supabase = createClient()

  const usedCategoryIds = new Set(budgets.map(b => b.category_id))
  const availableCategories = categories.filter(c => !usedCategoryIds.has(c.id))

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('budgets').insert({
      user_id: userId,
      category_id: form.category_id,
      amount: parseFloat(form.amount),
      month,
      year,
    })
    if (error) toast.error('Error al crear presupuesto')
    else { toast.success('Presupuesto creado'); setOpen(false); router.refresh(); setForm({ category_id: '', amount: '' }) }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('budgets').delete().eq('id', id)
    if (error) toast.error('Error al eliminar')
    else { toast.success('Presupuesto eliminado'); router.refresh() }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Presupuestos</h1>
          <p className="text-gray-400 text-sm">{MONTHS[month - 1]} {year}</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-emerald-600 hover:bg-emerald-700" disabled={availableCategories.length === 0}>
          <Plus className="h-4 w-4 mr-2" /> Nuevo presupuesto
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {budgets.length === 0 ? (
          <div className="col-span-full text-center text-gray-400 py-12">No tenés presupuestos este mes. ¡Creá uno!</div>
        ) : budgets.map(b => {
          const pct = Math.min((b.spent / b.amount) * 100, 100)
          const over = b.spent > b.amount
          return (
            <Card key={b.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{b.category?.icon} {b.category?.name}</CardTitle>
                <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-500 h-7 w-7" onClick={() => handleDelete(b.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className={over ? 'text-red-500 font-semibold' : 'text-gray-600'}>
                    {formatCurrency(b.spent)} gastado
                  </span>
                  <span className="text-gray-400">de {formatCurrency(b.amount)}</span>
                </div>
                <Progress value={pct} className={over ? '[&>div]:bg-red-500' : '[&>div]:bg-emerald-500'} />
                <p className="text-xs text-gray-400">
                  {over
                    ? `⚠️ Excedido en ${formatCurrency(b.spent - b.amount)}`
                    : `Disponible: ${formatCurrency(b.amount - b.spent)}`}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Nuevo presupuesto</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Categoría</Label>
              <Select value={form.category_id} onValueChange={v => setForm({ ...form, category_id: v ?? '' })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
                <SelectContent>{availableCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Monto límite</Label>
              <Input type="number" min="1" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading || !form.category_id} className="flex-1 bg-emerald-600 hover:bg-emerald-700">{loading ? 'Guardando...' : 'Crear'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
