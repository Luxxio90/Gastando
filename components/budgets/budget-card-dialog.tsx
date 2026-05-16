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

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

type CardForm = {
  name: string
  card_type: 'income' | 'expense'
  calc_type: 'manual' | 'category_sum' | 'percentage'
  manual_amount: string
  sum_category_id: string
  source_card_id: string
  percentage: string
  track_category_id: string
  color: string
}

const emptyForm: CardForm = {
  name: '',
  card_type: 'expense',
  calc_type: 'manual',
  manual_amount: '',
  sum_category_id: '',
  source_card_id: '',
  percentage: '',
  track_category_id: '',
  color: '#10b981',
}

interface Props {
  open: boolean
  onClose: () => void
  categories: Category[]
  cards: BudgetCard[]
  resolvedAmounts: Record<string, number>
  userId: string
  month: number
  year: number
  editing?: BudgetCard | null
}

export function BudgetCardDialog({ open, onClose, categories, cards, resolvedAmounts, userId, month, year, editing }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<CardForm>(emptyForm)

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        card_type: editing.card_type,
        calc_type: editing.calc_type,
        manual_amount: editing.manual_amount?.toString() ?? '',
        sum_category_id: editing.sum_category_id ?? '',
        source_card_id: editing.source_card_id ?? '',
        percentage: editing.percentage?.toString() ?? '',
        track_category_id: editing.track_category_id ?? '',
        color: editing.color,
      })
    } else {
      setForm(emptyForm)
    }
  }, [editing, open])

  const incomeCategories = categories.filter(c => c.type === 'income')
  const expenseCategories = categories.filter(c => c.type === 'expense')
  const sumCategories = form.card_type === 'income' ? incomeCategories : expenseCategories

  // Cards that can be source for percentage (exclude self if editing, prefer income cards)
  const sourceCards = cards.filter(c => !editing || c.id !== editing.id)

  // Preview of percentage calculation
  const sourceAmount = form.source_card_id ? (resolvedAmounts[form.source_card_id] ?? 0) : 0
  const percentagePreview = sourceAmount * (parseFloat(form.percentage) || 0) / 100

  // Preview for category_sum
  // (we can't compute this client-side without transactions, show placeholder)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (form.calc_type === 'category_sum' && !form.sum_category_id) {
      toast.error('Seleccioná una categoría')
      return
    }
    if (form.calc_type === 'percentage' && (!form.source_card_id || !form.percentage)) {
      toast.error('Seleccioná la tarjeta base y el porcentaje')
      return
    }

    setLoading(true)
    const payload = {
      user_id: userId,
      name: form.name.trim(),
      month,
      year,
      color: form.color,
      card_type: form.card_type,
      calc_type: form.calc_type,
      manual_amount: form.calc_type === 'manual' ? parseFloat(form.manual_amount) || 0 : null,
      sum_category_id: form.calc_type === 'category_sum' ? form.sum_category_id || null : null,
      source_card_id: form.calc_type === 'percentage' ? form.source_card_id || null : null,
      percentage: form.calc_type === 'percentage' ? parseFloat(form.percentage) || null : null,
      track_category_id: form.card_type === 'expense' ? form.track_category_id || null : null,
    }

    const { error } = editing
      ? await supabase.from('budget_cards').update(payload).eq('id', editing.id)
      : await supabase.from('budget_cards').insert(payload)

    if (error) {
      toast.error('Error al guardar: ' + error.message)
    } else {
      toast.success(editing ? 'Tarjeta actualizada' : 'Tarjeta creada')
      onClose()
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar tarjeta' : 'Nueva tarjeta de presupuesto'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Nombre */}
          <div className="space-y-2">
            <Label>Nombre</Label>
            <Input placeholder="Ej: Total sueldos, Gastos familiares..." value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>

          {/* Tipo de tarjeta */}
          <div className="space-y-2">
            <Label>Tipo</Label>
            <div className="flex gap-2">
              {(['income', 'expense'] as const).map(t => (
                <button key={t} type="button"
                  onClick={() => setForm({ ...form, card_type: t, sum_category_id: '', track_category_id: '' })}
                  className={cn(
                    'flex-1 py-2 rounded-lg text-sm font-medium border transition-colors',
                    form.card_type === t
                      ? t === 'income' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-red-500 text-white border-red-500'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  )}
                >
                  {t === 'income' ? '↑ Ingreso' : '↓ Gasto'}
                </button>
              ))}
            </div>
          </div>

          {/* Método de cálculo */}
          <div className="space-y-2">
            <Label>Cálculo del monto</Label>
            <div className="flex flex-col gap-2">
              {([
                { value: 'manual', label: 'Manual', desc: 'Ingresás el monto directamente' },
                { value: 'category_sum', label: 'Suma de categoría', desc: `Suma las transacciones de una categoría en ${['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][month - 1]}` },
                { value: 'percentage', label: 'Porcentual', desc: 'Porcentaje de otra tarjeta' },
              ] as const).map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => setForm({ ...form, calc_type: opt.value })}
                  className={cn(
                    'text-left px-3 py-2.5 rounded-lg border transition-colors',
                    form.calc_type === opt.value
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  )}
                >
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Campos según calc_type */}
          {form.calc_type === 'manual' && (
            <div className="space-y-2">
              <Label>Monto</Label>
              <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.manual_amount} onChange={e => setForm({ ...form, manual_amount: e.target.value })} required />
            </div>
          )}

          {form.calc_type === 'category_sum' && (
            <div className="space-y-2">
              <Label>Categoría a sumar</Label>
              <Select value={form.sum_category_id} onValueChange={v => setForm({ ...form, sum_category_id: v ?? '' })}>
                <SelectTrigger className="w-full">
                  <span className={form.sum_category_id ? 'text-sm' : 'text-sm text-muted-foreground'}>
                    {sumCategories.find(c => c.id === form.sum_category_id) ? `${sumCategories.find(c => c.id === form.sum_category_id)?.icon} ${sumCategories.find(c => c.id === form.sum_category_id)?.name}` : 'Seleccionar categoría'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {sumCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400">Sumará todas las transacciones de esta categoría en el mes seleccionado.</p>
            </div>
          )}

          {form.calc_type === 'percentage' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Tarjeta base</Label>
                {sourceCards.length === 0 ? (
                  <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">Primero creá una tarjeta de ingreso para usar como base.</p>
                ) : (
                  <div className="space-y-1.5">
                    {sourceCards.map(c => (
                      <button key={c.id} type="button"
                        onClick={() => setForm({ ...form, source_card_id: c.id })}
                        className={cn(
                          'w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors',
                          form.source_card_id === c.id
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-gray-200 hover:border-gray-300'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{c.name}</span>
                          <span className="text-gray-500 text-xs">{formatCurrency(resolvedAmounts[c.id] ?? 0)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Porcentaje (%)</Label>
                <Input type="number" min="1" max="100" step="0.1" placeholder="60" value={form.percentage} onChange={e => setForm({ ...form, percentage: e.target.value })} />
              </div>
              {form.source_card_id && form.percentage && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <span className="text-gray-500">Calculado: </span>
                  <span className="font-semibold text-gray-800">{formatCurrency(percentagePreview)}</span>
                  <span className="text-gray-400 text-xs ml-1">({form.percentage}% de {formatCurrency(sourceAmount)})</span>
                </div>
              )}
            </div>
          )}

          {/* Seguimiento de gastos (solo para expense cards) */}
          {form.card_type === 'expense' && (
            <div className="space-y-2">
              <Label>Seguimiento de gastos <span className="text-gray-400 font-normal text-xs">(opcional)</span></Label>
              <Select value={form.track_category_id} onValueChange={v => setForm({ ...form, track_category_id: v ?? '' })}>
                <SelectTrigger className="w-full">
                  <span className={form.track_category_id ? 'text-sm' : 'text-sm text-muted-foreground'}>
                    {form.track_category_id
                      ? (() => { const c = expenseCategories.find(c => c.id === form.track_category_id); return c ? `${c.icon} ${c.name}` : 'Sin seguimiento' })()
                      : 'Sin seguimiento'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin seguimiento</SelectItem>
                  {expenseCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400">Mostrará cuánto se gastó en esa categoría vs el presupuesto.</p>
            </div>
          )}

          {/* Color */}
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button key={c} type="button"
                  className={`h-7 w-7 rounded-full border-2 transition-transform ${form.color === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setForm({ ...form, color: c })}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
              {loading ? 'Guardando...' : editing ? 'Guardar cambios' : 'Crear tarjeta'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
