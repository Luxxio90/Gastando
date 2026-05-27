'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, TrendingUp, TrendingDown, RefreshCw, MoreVertical } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { formatCurrency } from '@/lib/utils'
import type { Investment, InvestmentType } from '@/types'

const TYPE_META: Record<InvestmentType, { label: string; icon: string; color: string }> = {
  stock:        { label: 'Acciones',    icon: '📈', color: '#3b82f6' },
  crypto:       { label: 'Cripto',      icon: '₿',  color: '#f97316' },
  real_estate:  { label: 'Inmueble',    icon: '🏠', color: '#10b981' },
  fixed_income: { label: 'Plazo fijo',  icon: '🏦', color: '#8b5cf6' },
  other:        { label: 'Otro',        icon: '💼', color: '#6b7280' },
}

const CURRENCIES = ['ARS', 'USD', 'EUR', 'BTC', 'USDT']

type Form = {
  name: string
  type: InvestmentType
  initial_amount: string
  current_value: string
  currency: string
  purchase_date: string
  notes: string
}

const emptyForm: Form = {
  name: '', type: 'stock', initial_amount: '', current_value: '',
  currency: 'ARS', purchase_date: new Date().toISOString().split('T')[0], notes: '',
}

interface Props {
  investments: Investment[]
  userId: string
}

export function InversionesView({ investments: initial, userId }: Props) {
  const supabase = createClient()
  const [investments, setInvestments] = useState(initial)
  const [dialog, setDialog] = useState(false)
  const [editing, setEditing] = useState<Investment | null>(null)
  const [form, setForm] = useState<Form>(emptyForm)
  const [loading, setLoading] = useState(false)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [updateId, setUpdateId] = useState<string | null>(null)
  const [updateVal, setUpdateVal] = useState('')

  // ── Totals ──────────────────────────────────────────────────────
  const totalInvested = investments.reduce((s, i) => s + i.initial_amount, 0)
  const totalCurrent  = investments.reduce((s, i) => s + i.current_value, 0)
  const totalGain     = totalCurrent - totalInvested
  const totalPct      = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0
  const isPositive    = totalGain >= 0

  // ── Pie data ─────────────────────────────────────────────────────
  const pieData = Object.entries(TYPE_META).map(([type, meta]) => ({
    name: meta.label,
    value: investments.filter(i => i.type === type).reduce((s, i) => s + i.current_value, 0),
    color: meta.color,
  })).filter(d => d.value > 0)

  // ── CRUD ─────────────────────────────────────────────────────────
  function openCreate() {
    setEditing(null); setForm(emptyForm); setDialog(true)
  }
  function openEdit(inv: Investment) {
    setEditing(inv)
    setForm({
      name: inv.name, type: inv.type as InvestmentType, initial_amount: String(inv.initial_amount),
      current_value: String(inv.current_value), currency: inv.currency,
      purchase_date: inv.purchase_date, notes: inv.notes ?? '',
    })
    setDialog(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const payload = {
      name: form.name, type: form.type,
      initial_amount: parseFloat(form.initial_amount),
      current_value: parseFloat(form.current_value),
      currency: form.currency, purchase_date: form.purchase_date,
      notes: form.notes || null,
    }
    if (editing) {
      const { error } = await supabase.from('investments').update(payload).eq('id', editing.id)
      if (error) { toast.error('Error al guardar'); setLoading(false); return }
      setInvestments(prev => prev.map(i => i.id === editing.id ? { ...i, ...payload } : i))
      toast.success('Inversión actualizada')
    } else {
      const { data, error } = await supabase.from('investments').insert({ user_id: userId, ...payload }).select().single()
      if (error || !data) { toast.error('Error al crear'); setLoading(false); return }
      setInvestments(prev => [data as Investment, ...prev])
      toast.success('Inversión agregada')
    }
    setDialog(false); setLoading(false)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('investments').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar'); return }
    setInvestments(prev => prev.filter(i => i.id !== id))
    toast.success('Inversión eliminada')
    setMenuId(null)
  }

  async function handleQuickUpdate(id: string) {
    const val = parseFloat(updateVal)
    if (isNaN(val) || val < 0) { toast.error('Valor inválido'); return }
    const { error } = await supabase.from('investments').update({ current_value: val }).eq('id', id)
    if (error) { toast.error('Error al actualizar'); return }
    setInvestments(prev => prev.map(i => i.id === id ? { ...i, current_value: val } : i))
    toast.success('Precio actualizado')
    setUpdateId(null); setUpdateVal('')
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-bold text-foreground">Inversiones</h1>
        <button
          onClick={openCreate}
          className="text-sm font-semibold flex items-center gap-1"
          style={{ color: '#7C4DFF' }}
        >
          <Plus className="h-4 w-4" /> Agregar
        </button>
      </div>

      {investments.length === 0 ? (
        <div className="text-center text-muted-foreground py-16 border-2 border-dashed border-border rounded-2xl">
          <TrendingUp className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Sin inversiones</p>
          <p className="text-sm mt-1">Agregá tu primera inversión para ver tu portafolio</p>
        </div>
      ) : (
        <>
          {/* Summary card */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Valor del portafolio</p>
                <p className="text-3xl font-bold text-foreground">{formatCurrency(totalCurrent)}</p>
              </div>
              <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-bold ${isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {isPositive ? '+' : ''}{totalPct.toFixed(1)}%
              </div>
            </div>
            <div className="flex gap-4 pt-1 border-t border-border">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Invertido</p>
                <p className="text-sm font-semibold text-foreground">{formatCurrency(totalInvested)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Ganancia/Pérdida</p>
                <p className={`text-sm font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                  {isPositive ? '+' : ''}{formatCurrency(Math.abs(totalGain))}
                </p>
              </div>
            </div>
          </div>

          {/* Pie chart */}
          {pieData.length > 1 && (
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-sm font-semibold text-foreground mb-3">Distribución</p>
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={120} height={120}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={52} dataKey="value" strokeWidth={0}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: 12 }}
                      formatter={(v) => [formatCurrency(v as number), '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5">
                  {pieData.map(d => (
                    <div key={d.name} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                        <span className="text-xs text-muted-foreground">{d.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-foreground">{totalCurrent > 0 ? Math.round((d.value / totalCurrent) * 100) : 0}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Investment list */}
          <div className="space-y-3">
            {investments.map(inv => {
              const meta = TYPE_META[inv.type as InvestmentType] ?? TYPE_META.other
              const gain = inv.current_value - inv.initial_amount
              const pct  = inv.initial_amount > 0 ? (gain / inv.initial_amount) * 100 : 0
              const pos  = gain >= 0

              return (
                <div key={inv.id} className="bg-card border border-border rounded-2xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-9 w-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                        style={{ backgroundColor: meta.color + '20' }}>
                        {meta.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground text-sm truncate">{inv.name}</p>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: meta.color + '20', color: meta.color }}>
                          {meta.label}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <div className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold ${pos ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {pos ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {pos ? '+' : ''}{pct.toFixed(1)}%
                      </div>
                      <div className="relative">
                        <button onClick={() => setMenuId(menuId === inv.id ? null : inv.id)}
                          className="p-1.5 text-muted-foreground hover:text-foreground">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {menuId === inv.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setMenuId(null)} />
                            <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-xl shadow-xl py-1 min-w-[130px]">
                              <button onClick={() => { openEdit(inv); setMenuId(null) }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted">
                                <Pencil className="h-3.5 w-3.5" /> Editar
                              </button>
                              <button onClick={() => handleDelete(inv.id)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-muted">
                                <Trash2 className="h-3.5 w-3.5" /> Eliminar
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5">Invertido</p>
                      <p className="text-sm font-semibold text-foreground">{formatCurrency(inv.initial_amount, inv.currency)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground mb-0.5">Valor actual</p>
                      <p className="text-sm font-bold" style={{ color: pos ? '#10b981' : '#ef4444' }}>
                        {formatCurrency(inv.current_value, inv.currency)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground">
                      Compra: {new Date(inv.purchase_date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                      {inv.currency !== 'ARS' && <span className="ml-1.5 font-semibold">{inv.currency}</span>}
                    </p>

                    {updateId === inv.id ? (
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Nuevo valor"
                          value={updateVal}
                          onChange={e => setUpdateVal(e.target.value)}
                          className="h-7 text-xs w-28 rounded-lg"
                          autoFocus
                        />
                        <Button size="sm" onClick={() => handleQuickUpdate(inv.id)}
                          className="h-7 text-xs px-2 rounded-lg"
                          style={{ background: '#7C4DFF' }}>OK</Button>
                        <button onClick={() => { setUpdateId(null); setUpdateVal('') }}
                          className="text-xs text-muted-foreground">✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setUpdateId(inv.id); setUpdateVal(String(inv.current_value)) }}
                        className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <RefreshCw className="h-3 w-3" /> Actualizar precio
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Dialog */}
      <Dialog open={dialog} onOpenChange={v => { if (!v) setDialog(false) }}>
        <DialogContent className="sm:max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar inversión' : 'Nueva inversión'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input placeholder="Ej: Apple, Bitcoin, Depto Palermo..." value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>

            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v as InvestmentType })}>
                <SelectTrigger className="w-full">
                  <span className="text-sm">{TYPE_META[form.type].icon} {TYPE_META[form.type].label}</span>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_META).map(([v, m]) => (
                    <SelectItem key={v} value={v}>{m.icon} {m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Monto invertido</Label>
                <Input type="number" min="0" step="0.01" placeholder="0.00"
                  value={form.initial_amount} onChange={e => setForm({ ...form, initial_amount: e.target.value })} required />
              </div>
              <div className="space-y-1.5">
                <Label>Valor actual</Label>
                <Input type="number" min="0" step="0.01" placeholder="0.00"
                  value={form.current_value} onChange={e => setForm({ ...form, current_value: e.target.value })} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Moneda</Label>
                <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v ?? '' })}>
                  <SelectTrigger className="w-full">
                    <span className="text-sm">{form.currency}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Fecha de compra</Label>
                <Input type="date" value={form.purchase_date}
                  onChange={e => setForm({ ...form, purchase_date: e.target.value })} required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notas <span className="text-muted-foreground font-normal text-xs">(opcional)</span></Label>
              <Input placeholder="Ej: 10 acciones a $150 c/u" value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })} />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setDialog(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Guardando...' : editing ? 'Guardar' : 'Agregar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
