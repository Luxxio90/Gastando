'use client'

import { useState } from 'react'
import { RecurringTransaction, Account, Category } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Repeat, Trash2, Pencil } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

const INCOME_COLOR  = '#00CB96'
const EXPENSE_COLOR = '#FF4D6D'

interface Props {
  recurring: RecurringTransaction[]
  accounts: Account[]
  categories: Category[]
  userId: string
}

interface EditForm {
  type: 'income' | 'expense'
  amount: string
  description: string
  day_of_month: string
  account_id: string
  category_id: string
  notes: string
}

export function RecurringList({ recurring, accounts, categories, userId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [toggling, setToggling]           = useState<string | null>(null)
  const [localActive, setLocalActive]     = useState<Record<string, boolean>>({})
  const [pendingDelete, setPendingDelete] = useState<RecurringTransaction | null>(null)
  const [deleting, setDeleting]           = useState(false)
  const [editing, setEditing]             = useState<RecurringTransaction | null>(null)
  const [editForm, setEditForm]           = useState<EditForm | null>(null)
  const [saving, setSaving]               = useState(false)

  if (recurring.length === 0) return null

  function isActive(rt: RecurringTransaction) {
    return rt.id in localActive ? localActive[rt.id] : rt.active
  }

  async function toggleActive(rt: RecurringTransaction) {
    const next = !isActive(rt)
    setLocalActive(prev => ({ ...prev, [rt.id]: next }))
    setToggling(rt.id)
    await supabase.from('recurring_transactions').update({ active: next }).eq('id', rt.id)
    router.refresh()
    setToggling(null)
  }

  async function handleDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    const { error } = await supabase.from('recurring_transactions').delete().eq('id', pendingDelete.id)
    if (error) toast.error('Error al eliminar')
    else {
      toast.success('Recurrente eliminada')
      setPendingDelete(null)
      router.refresh()
    }
    setDeleting(false)
  }

  function openEdit(rt: RecurringTransaction) {
    setEditing(rt)
    setEditForm({
      type: rt.type as 'income' | 'expense',
      amount: rt.amount.toString(),
      description: rt.description,
      day_of_month: rt.day_of_month.toString(),
      account_id: rt.account_id ?? '',
      category_id: rt.category_id ?? '',
      notes: rt.notes ?? '',
    })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editing || !editForm) return
    if (!editForm.account_id)  { toast.error('Seleccioná una cuenta');    return }
    if (!editForm.category_id) { toast.error('Seleccioná una categoría'); return }
    setSaving(true)

    const day = Math.min(Math.max(parseInt(editForm.day_of_month) || 1, 1), 28)
    const { error } = await supabase
      .from('recurring_transactions')
      .update({
        type: editForm.type,
        amount: parseFloat(editForm.amount),
        description: editForm.description,
        day_of_month: day,
        account_id: editForm.account_id,
        category_id: editForm.category_id,
        notes: editForm.notes || null,
      })
      .eq('id', editing.id)

    if (error) {
      toast.error('Error al guardar')
    } else {
      toast.success('Recurrente actualizada')
      setEditing(null)
      setEditForm(null)
      router.refresh()
    }
    setSaving(false)
  }

  const activeColor = editForm?.type === 'income' ? INCOME_COLOR : EXPENSE_COLOR
  const filteredCategories = editForm
    ? categories.filter(c => c.type === editForm.type)
    : []

  return (
    <>
      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Recurrentes</h2>
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {recurring.map(rt => {
                const color = rt.type === 'income' ? INCOME_COLOR : EXPENSE_COLOR
                return (
                  <div key={rt.id} className="flex items-center gap-3 px-4 py-3">
                    <div
                      className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: color + '18' }}
                    >
                      <Repeat className="h-4 w-4" style={{ color }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{rt.description}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Día {rt.day_of_month} de cada mes
                        {(rt.account as any)?.name ? ` · ${(rt.account as any).name}` : ''}
                        {!isActive(rt) && <span className="ml-1 text-muted-foreground/50">· Pausada</span>}
                      </p>
                    </div>

                    <span className="text-sm font-bold tabular-nums flex-shrink-0" style={{ color }}>
                      {rt.type === 'income' ? '+' : '-'}{formatCurrency(rt.amount)}
                    </span>

                    {/* Toggle activo */}
                    <button
                      onClick={() => toggleActive(rt)}
                      disabled={toggling === rt.id}
                      className="relative h-5 w-9 rounded-full flex-shrink-0 transition-colors disabled:opacity-50"
                      style={{ backgroundColor: isActive(rt) ? '#7C4DFF' : 'hsl(var(--muted))' }}
                    >
                      <span
                        className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
                        style={{ transform: isActive(rt) ? 'translateX(16px)' : 'translateX(2px)' }}
                      />
                    </button>

                    {/* Editar */}
                    <button
                      onClick={() => openEdit(rt)}
                      className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-colors flex-shrink-0"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>

                    {/* Eliminar */}
                    <button
                      onClick={() => setPendingDelete(rt)}
                      className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-red-500 hover:bg-red-500/10 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog edición */}
      <Dialog open={!!editing} onOpenChange={() => { setEditing(null); setEditForm(null) }}>
        <DialogContent className="sm:max-w-sm max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 border-border">
          <div
            className="px-5 pt-5 pb-4 border-b border-border flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${activeColor}18 0%, transparent 100%)` }}
          >
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: activeColor + '22' }}>
                <Repeat className="h-4 w-4" style={{ color: activeColor }} />
              </div>
              <DialogTitle className="text-base font-semibold text-foreground">Editar recurrente</DialogTitle>
            </div>
          </div>

          {editForm && (
            <form onSubmit={handleSave} className="overflow-y-auto flex-1 p-5 space-y-5">

              {/* Tipo */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Tipo</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['expense', 'income'] as const).map(t => {
                    const c      = t === 'income' ? INCOME_COLOR : EXPENSE_COLOR
                    const active = editForm.type === t
                    return (
                      <button
                        key={t} type="button"
                        onClick={() => setEditForm({ ...editForm, type: t, category_id: '' })}
                        className="py-2.5 rounded-xl text-sm font-bold border transition-all"
                        style={active
                          ? { backgroundColor: c + '20', borderColor: c + '60', color: c }
                          : { backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }
                        }
                      >
                        {t === 'income' ? '↑ Ingreso' : '↓ Gasto'}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Monto */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Monto</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground/60">$</span>
                  <Input
                    type="number" min="0" step="0.01" placeholder="0.00"
                    value={editForm.amount}
                    onChange={e => setEditForm({ ...editForm, amount: e.target.value })}
                    required
                    className="pl-8 h-14 text-2xl font-bold bg-muted/40 border-border/60 tracking-tight"
                    style={{ color: activeColor }}
                  />
                </div>
              </div>

              {/* Descripción */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Descripción</label>
                <Input
                  placeholder="Ej: Netflix, Alquiler..."
                  value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  required
                  className="bg-muted/40 border-border/60"
                />
              </div>

              {/* Día del mes */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Día del mes (1–28)</label>
                <Input
                  type="number" min="1" max="28" placeholder="1"
                  value={editForm.day_of_month}
                  onChange={e => setEditForm({ ...editForm, day_of_month: e.target.value })}
                  required
                  className="bg-muted/40 border-border/60"
                />
              </div>

              {/* Cuenta */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Cuenta</label>
                {accounts.length === 0 ? (
                  <p className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 p-2.5 rounded-lg">
                    No tenés cuentas. Creá una en la sección Cuentas.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {accounts.map(a => {
                      const active = editForm.account_id === a.id
                      return (
                        <button
                          key={a.id} type="button"
                          onClick={() => setEditForm({ ...editForm, account_id: a.id })}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all"
                          style={active
                            ? { backgroundColor: a.color + '20', borderColor: a.color + '60', color: 'hsl(var(--foreground))' }
                            : { backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }
                          }
                        >
                          <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />
                          {a.name}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Categoría */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Categoría</label>
                {filteredCategories.length === 0 ? (
                  <p className="text-xs text-muted-foreground bg-muted/40 border border-border p-2.5 rounded-lg">
                    No hay categorías para este tipo.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-0.5">
                    {filteredCategories.map(c => {
                      const active = editForm.category_id === c.id
                      const color  = c.color || '#7C4DFF'
                      return (
                        <button
                          key={c.id} type="button"
                          onClick={() => setEditForm({ ...editForm, category_id: c.id })}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all text-left"
                          style={active
                            ? { backgroundColor: color + '20', borderColor: color + '60', color: 'hsl(var(--foreground))' }
                            : { backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }
                          }
                        >
                          <span className="text-base leading-none flex-shrink-0">{c.icon}</span>
                          <span className="truncate">{c.name}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Notas */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Notas (opcional)</label>
                <Input
                  placeholder="Referencia, número de cuota..."
                  value={editForm.notes}
                  onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                  className="bg-muted/40 border-border/60"
                />
              </div>

              <div className="flex gap-2 pt-1 pb-2">
                <Button
                  type="button" variant="outline" className="flex-1"
                  onClick={() => { setEditing(null); setEditForm(null) }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="flex-1 font-semibold"
                  style={{ background: `linear-gradient(135deg, #7C4DFF 0%, #9C6DFF 100%)`, border: 'none', color: '#fff' }}
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminación */}
      <Dialog open={!!pendingDelete} onOpenChange={() => setPendingDelete(null)}>
        <DialogContent className="sm:max-w-xs p-0 gap-0 border-border overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-border"
            style={{ background: 'linear-gradient(135deg, #FF4D6D12 0%, transparent 100%)' }}>
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FF4D6D20' }}>
                <Trash2 className="h-4 w-4" style={{ color: '#FF4D6D' }} />
              </div>
              <DialogTitle className="text-base font-semibold text-foreground">Eliminar recurrente</DialogTitle>
            </div>
          </div>
          <div className="px-5 py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Se eliminará la plantilla. Las transacciones ya creadas se mantienen.
            </p>
            {pendingDelete && (
              <div className="bg-muted/40 rounded-xl px-3 py-2.5 flex items-center justify-between">
                <span className="text-sm font-medium text-foreground truncate">{pendingDelete.description}</span>
                <span className="text-sm font-bold tabular-nums text-red-500 flex-shrink-0 ml-2">
                  {formatCurrency(pendingDelete.amount)}
                </span>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setPendingDelete(null)}>Cancelar</Button>
              <Button
                className="flex-1 font-semibold"
                disabled={deleting}
                onClick={handleDelete}
                style={{ backgroundColor: '#FF4D6D', color: '#fff', border: 'none' }}
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
