'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { BudgetCard, Category } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

type CardForm = {
  name: string
  card_type: 'income' | 'expense'
  calc_type: 'manual' | 'category_sum'
  manual_amount: string
  sum_category_id: string
}

const emptyForm: CardForm = {
  name: '',
  card_type: 'expense',
  calc_type: 'manual',
  manual_amount: '',
  sum_category_id: '',
}

interface Props {
  open: boolean
  onClose: () => void
  categories: Category[]
  userId: string
  month: number
  year: number
  editing?: BudgetCard | null
  // Preview of category sums to show in dialog
  incomeByCat: Record<string, number>
  expenseByCat: Record<string, number>
}

export function BudgetCardDialog({ open, onClose, categories, userId, month, year, editing, incomeByCat, expenseByCat }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<CardForm>(emptyForm)

  const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        card_type: editing.card_type,
        calc_type: editing.calc_type === 'percentage' ? 'manual' : editing.calc_type,
        manual_amount: editing.manual_amount?.toString() ?? '',
        sum_category_id: editing.sum_category_id ?? '',
      })
    } else {
      setForm(emptyForm)
    }
  }, [editing, open])

  const sumCategories = form.card_type === 'income'
    ? categories.filter(c => c.type === 'income')
    : categories.filter(c => c.type === 'expense')

  const selectedCategory = sumCategories.find(c => c.id === form.sum_category_id)
  const categorySum = form.sum_category_id
    ? (form.card_type === 'income' ? incomeByCat[form.sum_category_id] : expenseByCat[form.sum_category_id]) ?? 0
    : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    if (form.calc_type === 'category_sum' && !form.sum_category_id) {
      toast.error('Seleccioná una categoría')
      return
    }

    setLoading(true)
    const payload = {
      user_id: userId,
      name: form.name.trim(),
      month,
      year,
      color: form.card_type === 'income' ? '#10b981' : '#3b82f6',
      card_type: form.card_type,
      calc_type: form.calc_type,
      manual_amount: form.calc_type === 'manual' ? parseFloat(form.manual_amount) || 0 : null,
      sum_category_id: form.calc_type === 'category_sum' ? form.sum_category_id || null : null,
      source_card_id: null,
      percentage: null,
      track_category_id: null,
    }

    const { error } = editing
      ? await supabase.from('budget_cards').update(payload).eq('id', editing.id)
      : await supabase.from('budget_cards').insert(payload)

    if (error) {
      toast.error('Error al guardar: ' + error.message)
    } else {
      toast.success(editing ? 'Fila actualizada' : 'Fila creada')
      onClose()
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar fila' : 'Nueva fila de presupuesto'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Nombre */}
          <div className="space-y-2">
            <Label>Categoría / Nombre</Label>
            <Input placeholder="Ej: Total sueldos, Gasto familiar, Ahorro..." value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <Label>Tipo</Label>
            <div className="flex gap-2">
              {(['income', 'expense'] as const).map(t => (
                <button key={t} type="button"
                  onClick={() => setForm({ ...form, card_type: t, sum_category_id: '' })}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-sm font-medium border transition-colors',
                    form.card_type === t
                      ? t === 'income' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  )}
                >
                  {t === 'income' ? '↑ Ingreso' : '↓ Gasto'}
                </button>
              ))}
            </div>
          </div>

          {/* Monto */}
          <div className="space-y-2">
            <Label>Monto</Label>
            <div className="flex gap-2 mb-2">
              {([
                { value: 'manual', label: 'Manual' },
                { value: 'category_sum', label: 'Suma de categoría' },
              ] as const).map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => setForm({ ...form, calc_type: opt.value, sum_category_id: '' })}
                  className={cn(
                    'flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                    form.calc_type === opt.value
                      ? 'border-gray-800 bg-gray-900 text-white'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {form.calc_type === 'manual' && (
              <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.manual_amount} onChange={e => setForm({ ...form, manual_amount: e.target.value })} required />
            )}

            {form.calc_type === 'category_sum' && (
              <div className="space-y-2">
                <Select value={form.sum_category_id} onValueChange={v => setForm({ ...form, sum_category_id: v ?? '' })}>
                  <SelectTrigger className="w-full">
                    <span className={form.sum_category_id ? 'text-sm' : 'text-sm text-muted-foreground'}>
                      {selectedCategory ? `${selectedCategory.icon} ${selectedCategory.name}` : 'Seleccionar categoría'}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {sumCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {form.sum_category_id && (
                  <p className="text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                    Suma en {MONTHS[month - 1]}: <span className="font-semibold text-gray-800">{formatCurrency(categorySum)}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-gray-900 hover:bg-gray-800">
              {loading ? 'Guardando...' : editing ? 'Guardar' : 'Agregar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
