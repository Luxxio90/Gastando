'use client'

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { BudgetCard, Category, Account } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { LayoutList } from 'lucide-react'

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
  track_account_id: string
}

const emptyForm: CardForm = {
  name: '', card_type: 'expense', calc_type: 'manual',
  manual_amount: '', sum_category_id: '', source_card_id: '', percentage: '',
  track_account_id: '',
}

interface Props {
  open: boolean
  onClose: () => void
  categories: Category[]
  cards: BudgetCard[]
  resolvedAmounts: Record<string, number>
  accounts: Account[]
  userId: string
  month: number
  year: number
  editing?: BudgetCard | null
  incomeByCat: Record<string, number>
  expenseByCat: Record<string, number>
}

const INCOME_COLOR  = '#00CB96'
const EXPENSE_COLOR = '#7C4DFF'

export function BudgetCardDialog({
  open, onClose, categories, cards, resolvedAmounts, accounts,
  userId, month, year, editing, incomeByCat, expenseByCat,
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
        track_account_id: editing.track_account_id ?? '',
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

  const sourceCards = cards.filter(c => !editing || c.id !== editing.id)
  const sourceCard  = sourceCards.find(c => c.id === form.source_card_id)
  const sourceAmount = form.source_card_id ? (resolvedAmounts[form.source_card_id] ?? 0) : 0
  const pctValue = parseFloat(form.percentage) || 0
  const pctPreview = sourceAmount * pctValue / 100

  const pctUsedBySameSource = useMemo(() => {
    if (!form.source_card_id) return 0
    return cards
      .filter(c => c.calc_type === 'percentage' && c.source_card_id === form.source_card_id && (!editing || c.id !== editing.id))
      .reduce((s, c) => s + (c.percentage ?? 0), 0)
  }, [cards, form.source_card_id, editing])

  const pctRemaining = 100 - pctUsedBySameSource
  const pctOverLimit = pctValue > pctRemaining

  const activeTypeColor = form.card_type === 'income' ? INCOME_COLOR : EXPENSE_COLOR

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
      user_id: userId, name: form.name.trim(), month, year,
      color: form.card_type === 'income' ? INCOME_COLOR : EXPENSE_COLOR,
      card_type: form.card_type,
      calc_type: form.calc_type,
      manual_amount: form.calc_type === 'manual' ? parseFloat(form.manual_amount) || 0 : null,
      sum_category_id: form.calc_type === 'category_sum' ? form.sum_category_id || null : null,
      source_card_id: form.calc_type === 'percentage' ? form.source_card_id || null : null,
      percentage: form.calc_type === 'percentage' ? pctValue : null,
      track_category_id: null,
      track_account_id: form.track_account_id || null,
      exceeded_at: form.track_account_id ? (editing?.exceeded_at ?? null) : null,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = editing
      ? await (supabase as any).from('budget_cards').update(payload).eq('id', editing.id)
      : await (supabase as any).from('budget_cards').insert(payload)

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
      <DialogContent className="sm:max-w-sm max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 border-border">
        {/* Header */}
        <div
          className="px-5 pt-5 pb-4 border-b border-border flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${activeTypeColor}18 0%, transparent 100%)` }}
        >
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: activeTypeColor + '22' }}>
              <LayoutList className="h-4 w-4" style={{ color: activeTypeColor }} />
            </div>
            <DialogTitle className="text-base font-semibold">
              {editing ? 'Editar fila' : 'Nueva fila'}
            </DialogTitle>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* Nombre */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              Nombre
            </label>
            <Input
              placeholder="Ej: Total sueldos, Gasto familiar..."
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              required
              className="bg-muted/40 border-border/60"
            />
          </div>

          {/* Tipo */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              {(['income', 'expense'] as const).map(t => {
                const color = t === 'income' ? INCOME_COLOR : EXPENSE_COLOR
                const active = form.card_type === t
                return (
                  <button
                    key={t} type="button"
                    onClick={() => setForm({ ...form, card_type: t, sum_category_id: '', source_card_id: '' })}
                    className="py-2.5 rounded-xl text-sm font-semibold border transition-all"
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

          {/* Cálculo */}
          <div className="space-y-2">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              Cálculo del monto
            </label>
            <div className="flex gap-1.5">
              {([
                { value: 'manual',       label: 'Manual' },
                { value: 'category_sum', label: 'Suma categ.' },
                { value: 'percentage',   label: '% de fila' },
              ] as const).map(opt => {
                const active = form.calc_type === opt.value
                return (
                  <button
                    key={opt.value} type="button"
                    onClick={() => setForm({ ...form, calc_type: opt.value, sum_category_id: '', source_card_id: '', percentage: '' })}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                    style={active
                      ? { backgroundColor: '#7C4DFF20', borderColor: '#7C4DFF50', color: '#7C4DFF' }
                      : { backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }
                    }
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>

            {/* Manual */}
            {form.calc_type === 'manual' && (
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <Input
                  type="number" min="0" step="0.01" placeholder="0.00"
                  value={form.manual_amount}
                  onChange={e => setForm({ ...form, manual_amount: e.target.value })}
                  required
                  className="pl-6 bg-muted/40 border-border/60 font-semibold"
                />
              </div>
            )}

            {/* Suma de categoría */}
            {form.calc_type === 'category_sum' && (
              <div className="space-y-2">
                <Select value={form.sum_category_id} onValueChange={v => setForm({ ...form, sum_category_id: v ?? '' })}>
                  <SelectTrigger className="w-full bg-muted/40 border-border/60">
                    <span className={form.sum_category_id ? 'text-sm' : 'text-sm text-muted-foreground'}>
                      {selectedSumCategory ? `${selectedSumCategory.icon} ${selectedSumCategory.name}` : 'Seleccionar categoría'}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {sumCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {form.sum_category_id && (
                  <div
                    className="px-3 py-2.5 rounded-xl text-xs"
                    style={{ backgroundColor: '#3BB2F615', border: '1px solid #3BB2F630' }}
                  >
                    <span className="text-muted-foreground">Suma en {MONTHS[month - 1]}: </span>
                    <span className="font-bold text-foreground">{formatCurrency(categorySum)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Porcentaje */}
            {form.calc_type === 'percentage' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Fila base</p>
                  {sourceCards.length === 0 ? (
                    <p className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 p-2.5 rounded-xl">
                      Primero creá otra fila para usar como base.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {sourceCards.map(c => {
                        const amt  = resolvedAmounts[c.id] ?? 0
                        const used = cards
                          .filter(x => x.calc_type === 'percentage' && x.source_card_id === c.id && (!editing || x.id !== editing.id))
                          .reduce((s, x) => s + (x.percentage ?? 0), 0)
                        const active = form.source_card_id === c.id
                        const cardColor = c.card_type === 'income' ? INCOME_COLOR : EXPENSE_COLOR
                        return (
                          <button
                            key={c.id} type="button"
                            onClick={() => setForm({ ...form, source_card_id: c.id })}
                            className="w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-all"
                            style={active
                              ? { backgroundColor: cardColor + '15', borderColor: cardColor + '50', color: 'hsl(var(--foreground))' }
                              : { backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }
                            }
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">{c.name}</span>
                              <span className="text-xs tabular-nums opacity-70">
                                {formatCurrency(amt)} · {(100 - used).toFixed(0)}% libre
                              </span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                    Porcentaje a asignar
                  </p>
                  <div className="relative">
                    <Input
                      type="number" min="0.1" max="100" step="0.1" placeholder="0"
                      value={form.percentage}
                      onChange={e => setForm({ ...form, percentage: e.target.value })}
                      className={`pr-8 bg-muted/40 border-border/60 ${pctOverLimit ? 'border-red-500/60' : ''}`}
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">%</span>
                  </div>
                  {form.source_card_id && (
                    <p className="text-xs" style={{ color: pctOverLimit ? '#FF4D6D' : 'hsl(var(--muted-foreground))' }}>
                      {pctOverLimit
                        ? `Excede el disponible (máx. ${pctRemaining.toFixed(1)}%)`
                        : `Disponible en "${sourceCard?.name}": ${pctRemaining.toFixed(1)}%`}
                    </p>
                  )}
                </div>

                {form.source_card_id && pctValue > 0 && !pctOverLimit && (
                  <div
                    className="px-3 py-2.5 rounded-xl text-sm"
                    style={{ backgroundColor: '#7C4DFF15', border: '1px solid #7C4DFF30' }}
                  >
                    <span className="text-muted-foreground">Monto calculado: </span>
                    <span className="font-bold text-foreground">{formatCurrency(pctPreview)}</span>
                    <span className="text-xs text-muted-foreground ml-1.5">
                      ({pctValue}% de {formatCurrency(sourceAmount)})
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cuenta de seguimiento */}
          {accounts.length > 0 && (
            <div className="space-y-1.5 border-t border-border/50 pt-4">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                Seguimiento de cuenta <span className="normal-case font-normal">(opcional)</span>
              </label>
              <p className="text-[11px] text-muted-foreground">
                Registrá cuánto se gastó de una cuenta contra este presupuesto.
              </p>
              <Select
                value={form.track_account_id}
                onValueChange={v => setForm({ ...form, track_account_id: v === '__none__' ? '' : v })}
              >
                <SelectTrigger className="w-full bg-muted/40 border-border/60">
                  <span className={form.track_account_id ? 'text-sm' : 'text-sm text-muted-foreground'}>
                    {form.track_account_id
                      ? (accounts.find(a => a.id === form.track_account_id)?.name ?? 'Cuenta')
                      : 'Sin seguimiento'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin seguimiento</SelectItem>
                  {accounts.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button
              type="submit"
              disabled={loading || (form.calc_type === 'percentage' && pctOverLimit)}
              className="flex-1 font-semibold"
              style={{ background: 'linear-gradient(135deg, #7C4DFF 0%, #9C6DFF 100%)', color: '#fff', border: 'none' }}
            >
              {loading ? 'Guardando...' : editing ? 'Guardar' : 'Agregar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
