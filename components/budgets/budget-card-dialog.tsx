'use client'

import { useState, useEffect, useMemo } from 'react'
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

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

type CalcType = 'manual' | 'category_sum' | 'percentage'

type CardForm = {
  name: string
  card_type: 'income' | 'expense'
  calc_type: CalcType
  manual_amount: string
  sum_category_id: string
  source_card_id: string
  percentage: string
}

const emptyForm: CardForm = {
  name: '',
  card_type: 'expense',
  calc_type: 'manual',
  manual_amount: '',
  sum_category_id: '',
  source_card_id: '',
  percentage: '',
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
  incomeByCat: Record<string, number>
  expenseByCat: Record<string, number>
}

export function BudgetCardDialog({
  open, onClose, categories, cards, resolvedAmounts,
  userId, month, year, editing, incomeByCat, expenseByCat
}: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<CardForm>(emptyForm)

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        card_type: editing.card_type,
        calc_type: editing.calc_type as CalcType,
        manual_amount: editing.manual_amount?.toString() ?? '',
        sum_category_id: editing.sum_category_id ?? '',
        source_card_id: editing.source_card_id ?? '',
        percentage: editing.percentage?.toString() ?? '',
      })
    } else {
      setForm(emptyForm)
    }
  }, [editing, open])

  const sumCategories = form.card_type === 'income'
    ? categories.filter(c => c.type === 'income')
    : categories.filter(c => c.type === 'expense')

  const selectedSumCategory = sumCategories.find(c => c.id === form.sum_category_id)
  const categorySum = form.sum_category_id
    ? (form.card_type === 'income' ? incomeByCat[form.sum_category_id] : expenseByCat[form.sum_category_id]) ?? 0
    : 0

  // Cards available as percentage source (all except self)
  const sourceCards = cards.filter(c => !editing || c.id !== editing.id)
  const sourceCard = sourceCards.find(c => c.id === form.source_card_id)
  const sourceAmount = form.source_card_id ? (resolvedAmounts[form.source_card_id] ?? 0) : 0
  const pctValue = parseFloat(form.percentage) || 0
  const pctPreview = sourceAmount * pctValue / 100

  // Validate: sum of % for same source_card_id must not exceed 100%
  const pctUsedBySameSource = useMemo(() => {
    if (!form.source_card_id) return 0
    return cards
      .filter(c => c.calc_type === 'percentage' && c.source_card_id === form.source_card_id && (!editing || c.id !== editing.id))
      .reduce((s, c) => s + (c.percentage ?? 0), 0)
  }, [cards, form.source_card_id, editing])

  const pctRemaining = 100 - pctUsedBySameSource
  const pctOverLimit = pctValue > pctRemaining

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return

    if (form.calc_type === 'category_sum' && !form.sum_category_id) {
      toast.error('Seleccioná una categoría'); return
    }
    if (form.calc_type === 'percentage') {
      if (!form.source_card_id) { toast.error('Seleccioná la fila base'); return }
      if (!form.percentage || pctValue <= 0) { toast.error('Ingresá un porcentaje válido'); return }
      if (pctOverLimit) {
        toast.error(`El porcentaje excede el disponible (${pctRemaining.toFixed(1)}% restante)`); return
      }
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
      source_card_id: form.calc_type === 'percentage' ? form.source_card_id || null : null,
      percentage: form.calc_type === 'percentage' ? pctValue : null,
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
      <DialogContent className="sm:max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar fila' : 'Nueva fila de presupuesto'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Nombre */}
          <div className="space-y-2">
            <Label>Categoría / Nombre</Label>
            <Input
              placeholder="Ej: Total sueldos, Gasto familiar..."
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <Label>Tipo</Label>
            <div className="flex gap-2">
              {(['income', 'expense'] as const).map(t => (
                <button key={t} type="button"
                  onClick={() => setForm({ ...form, card_type: t, sum_category_id: '', source_card_id: '' })}
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

          {/* Cálculo del monto */}
          <div className="space-y-2">
            <Label>Cálculo del monto</Label>
            <div className="flex gap-1.5">
              {([
                { value: 'manual', label: 'Manual' },
                { value: 'category_sum', label: 'Suma categ.' },
                { value: 'percentage', label: '% de fila' },
              ] as const).map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => setForm({ ...form, calc_type: opt.value, sum_category_id: '', source_card_id: '', percentage: '' })}
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

            {/* Manual */}
            {form.calc_type === 'manual' && (
              <Input
                type="number" min="0" step="0.01" placeholder="0.00"
                value={form.manual_amount}
                onChange={e => setForm({ ...form, manual_amount: e.target.value })}
                required
              />
            )}

            {/* Suma de categoría */}
            {form.calc_type === 'category_sum' && (
              <div className="space-y-2">
                <Select value={form.sum_category_id} onValueChange={v => setForm({ ...form, sum_category_id: v ?? '' })}>
                  <SelectTrigger className="w-full">
                    <span className={form.sum_category_id ? 'text-sm' : 'text-sm text-muted-foreground'}>
                      {selectedSumCategory ? `${selectedSumCategory.icon} ${selectedSumCategory.name}` : 'Seleccionar categoría'}
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

            {/* Porcentaje */}
            {form.calc_type === 'percentage' && (
              <div className="space-y-3">
                {/* Selector de fila base */}
                <div className="space-y-1.5">
                  <p className="text-xs text-gray-500">Fila base</p>
                  {sourceCards.length === 0 ? (
                    <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">Primero creá otra fila para usar como base.</p>
                  ) : (
                    <div className="space-y-1">
                      {sourceCards.map(c => {
                        const amt = resolvedAmounts[c.id] ?? 0
                        const used = cards
                          .filter(x => x.calc_type === 'percentage' && x.source_card_id === c.id && (!editing || x.id !== editing.id))
                          .reduce((s, x) => s + (x.percentage ?? 0), 0)
                        return (
                          <button key={c.id} type="button"
                            onClick={() => setForm({ ...form, source_card_id: c.id })}
                            className={cn(
                              'w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors',
                              form.source_card_id === c.id
                                ? 'border-gray-800 bg-gray-900 text-white'
                                : 'border-gray-200 hover:border-gray-300 text-gray-700'
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{c.name}</span>
                              <span className={cn('text-xs', form.source_card_id === c.id ? 'text-gray-300' : 'text-gray-400')}>
                                {formatCurrency(amt)} · {(100 - used).toFixed(0)}% libre
                              </span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Input porcentaje */}
                <div className="space-y-1.5">
                  <p className="text-xs text-gray-500">Porcentaje a asignar</p>
                  <div className="relative">
                    <Input
                      type="number" min="0.1" max="100" step="0.1"
                      placeholder="0"
                      value={form.percentage}
                      onChange={e => setForm({ ...form, percentage: e.target.value })}
                      className={cn('pr-8', pctOverLimit ? 'border-red-400 focus-visible:ring-red-300' : '')}
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">%</span>
                  </div>
                  {form.source_card_id && (
                    <p className={cn('text-xs', pctOverLimit ? 'text-red-500' : 'text-gray-400')}>
                      {pctOverLimit
                        ? `⚠️ Excede el disponible (máx. ${pctRemaining.toFixed(1)}%)`
                        : `Disponible en "${sourceCard?.name}": ${pctRemaining.toFixed(1)}%`
                      }
                    </p>
                  )}
                </div>

                {/* Preview */}
                {form.source_card_id && pctValue > 0 && !pctOverLimit && (
                  <div className="bg-gray-50 rounded-lg px-3 py-2.5 text-sm">
                    <span className="text-gray-500">Monto calculado: </span>
                    <span className="font-bold text-gray-900">{formatCurrency(pctPreview)}</span>
                    <span className="text-gray-400 text-xs ml-1">
                      ({pctValue}% de {formatCurrency(sourceAmount)})
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading || (form.calc_type === 'percentage' && pctOverLimit)} className="flex-1 bg-gray-900 hover:bg-gray-800">
              {loading ? 'Guardando...' : editing ? 'Guardar' : 'Agregar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
