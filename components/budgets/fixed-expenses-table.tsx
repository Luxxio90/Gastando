'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Plus, MoreVertical } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Category, FixedExpenseItem, FixedExpenseStatus } from '@/types'

interface Props {
  items: FixedExpenseItem[]
  fixedCategories: Category[]   // only "Gasto fijo" expense categories
  userId: string
  month: number
  year: number
}

type FormState = {
  category_id: string
  description: string
  amount: string
  status: FixedExpenseStatus
  responsible: string
}

const emptyForm: FormState = {
  category_id: '',
  description: '',
  amount: '',
  status: 'pending',
  responsible: '',
}

const STATUS_OPTS: { value: FixedExpenseStatus; label: string; cls: string }[] = [
  { value: 'paid',           label: 'Pagado',         cls: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { value: 'pending',        label: 'Pendiente',      cls: 'bg-red-100 text-red-700 border-red-300' },
  { value: 'not_applicable', label: 'No corresponde', cls: 'bg-amber-100 text-amber-700 border-amber-300' },
]

function statusStyle(s: FixedExpenseStatus) {
  return STATUS_OPTS.find(o => o.value === s)?.cls ?? ''
}
function statusLabel(s: FixedExpenseStatus) {
  return STATUS_OPTS.find(o => o.value === s)?.label ?? s
}

export function FixedExpensesTable({ items, fixedCategories, userId, month, year }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<FixedExpenseItem | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [loading, setLoading] = useState(false)

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(item: FixedExpenseItem) {
    setEditing(item)
    setForm({
      category_id: item.category_id ?? '',
      description: item.description ?? '',
      amount: item.amount.toString(),
      status: item.status,
      responsible: item.responsible ?? '',
    })
    setDialogOpen(true)
  }

  function closeDialog() { setDialogOpen(false); setEditing(null); setForm(emptyForm) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const payload = {
      user_id: userId,
      month,
      year,
      category_id: form.category_id || null,
      description: form.description.trim() || null,
      amount: parseFloat(form.amount) || 0,
      status: form.status,
      responsible: form.responsible.trim() || null,
    }

    const { error } = editing
      ? await supabase.from('fixed_expense_items').update(payload).eq('id', editing.id)
      : await supabase.from('fixed_expense_items').insert(payload)

    if (error) toast.error('Error al guardar')
    else {
      toast.success(editing ? 'Fila actualizada' : 'Fila agregada')
      closeDialog()
      router.refresh()
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('fixed_expense_items').delete().eq('id', id)
    if (error) toast.error('Error al eliminar')
    else { toast.success('Fila eliminada'); router.refresh() }
  }

  const total = items.reduce((s, i) => s + i.amount, 0)
  const totalPaid = items.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)

  const selectedCat = fixedCategories.find(c => c.id === form.category_id)

  return (
    <>
      <div className="space-y-2 max-w-2xl mx-auto mt-6">
        {/* Section header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Gastos fijos</h2>
            <p className="text-xs text-gray-400 mt-0.5">Solo categorías de tipo "Gasto fijo"</p>
          </div>
          <Button size="sm" onClick={openCreate} className="bg-gray-900 hover:bg-gray-800">
            <Plus className="h-4 w-4 mr-1" /> Agregar fila
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="text-center text-gray-400 py-10 border-2 border-dashed border-gray-200 rounded-xl">
            <p className="font-medium text-sm">Sin gastos fijos</p>
            <p className="text-xs mt-0.5">Agregá una fila para comenzar</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            {/* Columnas header */}
            <div className="grid grid-cols-[1fr_80px_100px_32px] bg-gray-50 border-b border-gray-200 px-4 py-2.5">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Categoría / Descripción</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide text-right">Monto</span>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide text-center">Estado</span>
              <span />
            </div>

            {/* Rows */}
            {items.map(item => {
              const cat = fixedCategories.find(c => c.id === item.category_id)
              return (
                <div
                  key={item.id}
                  onClick={() => openEdit(item)}
                  className="grid grid-cols-[1fr_80px_100px_32px] items-center px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {cat ? `${cat.icon} ${cat.name}` : <span className="text-gray-400 italic">Sin categoría</span>}
                    </p>
                    {item.description && (
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">{item.description}</p>
                    )}
                    {item.responsible && (
                      <p className="text-[10px] text-blue-500 truncate mt-0.5">👤 {item.responsible}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-gray-800">{formatCurrency(item.amount)}</span>
                  </div>
                  <div className="flex justify-center">
                    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full border', statusStyle(item.status))}>
                      {statusLabel(item.status)}
                    </span>
                  </div>
                  <div className="flex justify-end" onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="p-1 rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(item)}>Editar</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(item.id)}>Eliminar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )
            })}

            {/* Totales */}
            <div className="grid grid-cols-[1fr_80px_100px_32px] items-center px-4 py-2.5 bg-gray-50">
              <div>
                <span className="text-xs font-semibold text-gray-600">Total</span>
                <span className="ml-2 text-[10px] text-emerald-600 font-medium">
                  {formatCurrency(totalPaid)} pagado
                </span>
              </div>
              <span className="text-right text-sm font-bold text-gray-800">{formatCurrency(total)}</span>
              <span />
              <span />
            </div>
          </div>
        )}
      </div>

      {/* Dialog agregar / editar */}
      <Dialog open={dialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar gasto fijo' : 'Nuevo gasto fijo'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Categoría */}
            <div className="space-y-2">
              <Label>Categoría</Label>
              {fixedCategories.length === 0 ? (
                <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
                  No hay categorías de tipo "Gasto fijo". Creá una en Ajustes → Categorías.
                </p>
              ) : (
                <Select value={form.category_id} onValueChange={v => setForm({ ...form, category_id: v ?? '' })}>
                  <SelectTrigger className="w-full">
                    <span className={form.category_id ? 'text-sm' : 'text-sm text-muted-foreground'}>
                      {selectedCat ? `${selectedCat.icon} ${selectedCat.name}` : 'Seleccionar categoría'}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {fixedCategories.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label>Descripción <span className="text-gray-400 font-normal text-xs">(opcional)</span></Label>
              <Input
                placeholder="Ej: Gas, Internet, Alquiler..."
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
              />
            </div>

            {/* Monto */}
            <div className="space-y-2">
              <Label>Monto</Label>
              <Input
                type="number" min="0" step="0.01" placeholder="0.00"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                required
              />
            </div>

            {/* Estado */}
            <div className="space-y-2">
              <Label>Estado</Label>
              <div className="flex flex-col gap-1.5">
                {STATUS_OPTS.map(opt => (
                  <button key={opt.value} type="button"
                    onClick={() => setForm({ ...form, status: opt.value })}
                    className={cn(
                      'flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors text-left',
                      form.status === opt.value ? opt.cls : 'border-gray-200 text-gray-400 hover:border-gray-300'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Responsable */}
            <div className="space-y-2">
              <Label>Encargado de pago <span className="text-gray-400 font-normal text-xs">(opcional)</span></Label>
              <Input
                placeholder="Ej: Lucio, Agustina..."
                value={form.responsible}
                onChange={e => setForm({ ...form, responsible: e.target.value })}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={closeDialog}>Cancelar</Button>
              <Button type="submit" disabled={loading} className="flex-1 bg-gray-900 hover:bg-gray-800">
                {loading ? 'Guardando...' : editing ? 'Guardar' : 'Agregar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
