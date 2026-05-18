'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Account } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Plus, MoreVertical, ChevronRight, Settings2, GripVertical } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  DndContext, closestCenter, PointerSensor, TouchSensor, KeyboardSensor,
  useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

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

const CARDS_KEY = (userId: string) => `gastando_cards_${userId}`
const ORDER_KEY = (userId: string) => `gastando_accounts_order_${userId}`

interface Props {
  accounts: Account[]
  userId: string
}

// Sortable account card
function SortableAccountCard({
  account,
  onEdit,
  onDelete,
}: {
  account: Account
  onEdit: (a: Account) => void
  onDelete: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: account.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const typeLabel = ACCOUNT_TYPES.find(t => t.value === account.type)?.label ?? ''

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        {/* color bar */}
        <div className="h-1.5" style={{ backgroundColor: account.color }} />

        {/* Nombre — ancho completo, hasta 2 líneas */}
        <div className="px-3 pt-2.5 pb-0">
          <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2">{account.name}</p>
        </div>

        {/* Fila: grip · balance (link) · chevron · menú */}
        <div className="flex items-center gap-1 px-2 pt-1.5 pb-3">
          <button
            {...attributes}
            {...listeners}
            className="p-0.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
            aria-label="Mover"
          >
            <GripVertical className="h-3.5 w-3.5" />
          </button>

          <Link href={`/accounts/${account.id}`} className="flex-1 min-w-0 group">
            <p className="text-base font-bold text-gray-900 truncate leading-tight">
              {formatCurrency(account.balance, account.currency)}
            </p>
            <p className="text-[10px] text-gray-400 truncate">{typeLabel}</p>
          </Link>

          <Link href={`/accounts/${account.id}`} className="flex-shrink-0">
            <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger
              className="p-1 rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0"
              onClick={e => e.preventDefault()}
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(account)}>Editar</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600" onClick={() => onDelete(account.id)}>Eliminar</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Card>
    </div>
  )
}

export function AccountsList({ accounts, userId }: Props) {
  const [order, setOrder] = useState<string[]>([])
  const [mode, setMode] = useState<'create' | 'edit' | null>(null)
  const [editing, setEditing] = useState<Account | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [balanceIds, setBalanceIds] = useState<string[] | null>(null)
  const [balanceConfigOpen, setBalanceConfigOpen] = useState(false)
  const [draft, setDraft] = useState<string[]>([])
  const router = useRouter()
  const supabase = createClient()

  // Load order + balance config from localStorage
  useEffect(() => {
    try {
      const storedOrder = localStorage.getItem(ORDER_KEY(userId))
      if (storedOrder) {
        const parsed: string[] = JSON.parse(storedOrder)
        // merge: keep stored order for known IDs, append new ones
        const known = new Set(accounts.map(a => a.id))
        const merged = [
          ...parsed.filter(id => known.has(id)),
          ...accounts.map(a => a.id).filter(id => !parsed.includes(id)),
        ]
        setOrder(merged)
      } else {
        setOrder(accounts.map(a => a.id))
      }
    } catch {
      setOrder(accounts.map(a => a.id))
    }

    try {
      const raw = localStorage.getItem(CARDS_KEY(userId))
      if (raw) setBalanceIds(JSON.parse(raw).balance ?? null)
    } catch {}
  }, [userId, accounts.length]) // re-run when account count changes (new account created)

  const sortedAccounts = order
    .map(id => accounts.find(a => a.id === id))
    .filter(Boolean) as Account[]

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = order.indexOf(active.id as string)
    const newIdx = order.indexOf(over.id as string)
    const newOrder = arrayMove(order, oldIdx, newIdx)
    setOrder(newOrder)
    localStorage.setItem(ORDER_KEY(userId), JSON.stringify(newOrder))
  }

  // Balance total config
  const includedAccounts = balanceIds === null ? accounts : accounts.filter(a => balanceIds.includes(a.id))
  const totalBalance = includedAccounts.reduce((s, a) => s + a.balance, 0)

  function openBalanceConfig() {
    setDraft(balanceIds ?? accounts.map(a => a.id))
    setBalanceConfigOpen(true)
  }

  function applyBalanceConfig() {
    const newVal = draft.length === accounts.length ? null : draft
    setBalanceIds(newVal)
    try {
      const raw = localStorage.getItem(CARDS_KEY(userId))
      const current = raw ? JSON.parse(raw) : {}
      localStorage.setItem(CARDS_KEY(userId), JSON.stringify({ ...current, balance: newVal }))
    } catch {}
    setBalanceConfigOpen(false)
  }

  // Account CRUD
  function openCreate() { setForm(emptyForm); setEditing(null); setMode('create') }

  function openEdit(account: Account) {
    setForm({ name: account.name, type: account.type, balance: account.balance.toString(), currency: account.currency, color: account.color })
    setEditing(account)
    setMode('edit')
  }

  function closeDialog() { setMode(null); setEditing(null); setForm(emptyForm) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    if (mode === 'create') {
      const { error } = await supabase.from('accounts').insert({
        user_id: userId, name: form.name, type: form.type,
        balance: parseFloat(form.balance) || 0, currency: form.currency, color: form.color,
      })
      if (error) toast.error('Error al crear la cuenta')
      else { toast.success('Cuenta creada'); closeDialog(); router.refresh() }
    } else if (mode === 'edit' && editing) {
      const { error } = await supabase.from('accounts').update({
        name: form.name, type: form.type,
        balance: parseFloat(form.balance) || 0, currency: form.currency, color: form.color,
      }).eq('id', editing.id)
      if (error) toast.error('Error al guardar los cambios')
      else { toast.success('Cuenta actualizada'); closeDialog(); router.refresh() }
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('accounts').delete().eq('id', id)
    if (error) toast.error('No se puede eliminar (tiene transacciones asociadas)')
    else {
      toast.success('Cuenta eliminada')
      setOrder(prev => prev.filter(x => x !== id))
      router.refresh()
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cuentas</h1>
          <div className="flex items-center gap-1 mt-0.5">
            <p className="text-gray-400 text-sm">
              Balance total: <span className="font-semibold text-gray-700">{formatCurrency(totalBalance)}</span>
            </p>
            <button onClick={openBalanceConfig}
              className="p-0.5 rounded hover:bg-gray-100 text-gray-300 hover:text-gray-600 transition-colors"
              title="Configurar cuentas">
              <Settings2 className="h-3.5 w-3.5" />
            </button>
            {balanceIds !== null && (
              <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                {balanceIds.length} de {accounts.length}
              </span>
            )}
          </div>
        </div>
        <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" /> Nueva cuenta
        </Button>
      </div>

      {/* Grid de cuentas */}
      {accounts.length === 0 ? (
        <div className="text-center text-gray-400 py-12 border-2 border-dashed border-gray-200 rounded-xl">
          No tenés cuentas aún. ¡Creá una!
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={order} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-3">
              {sortedAccounts.map(a => (
                <SortableAccountCard
                  key={a.id}
                  account={a}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Balance config dialog */}
      <Dialog open={balanceConfigOpen} onOpenChange={setBalanceConfigOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>Configurar — Balance total</DialogTitle></DialogHeader>
          <p className="text-xs text-gray-500 -mt-2">Seleccioná qué cuentas incluir en el total</p>
          <div className="space-y-1.5">
            {accounts.map(a => {
              const selected = draft.includes(a.id)
              return (
                <button key={a.id} type="button" onClick={() => setDraft(prev => prev.includes(a.id) ? prev.filter(x => x !== a.id) : [...prev, a.id])}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-colors ${selected ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-gray-200 text-gray-400 bg-gray-50'}`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />
                    <span className="font-medium">{a.name}</span>
                  </div>
                  <span className="text-xs tabular-nums">{formatCurrency(a.balance, a.currency)}</span>
                </button>
              )
            })}
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setBalanceConfigOpen(false)}>Cancelar</Button>
            <Button className="flex-1 bg-gray-900 hover:bg-gray-800" onClick={applyBalanceConfig} disabled={draft.length === 0}>Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create / Edit account dialog */}
      <Dialog open={mode !== null} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{mode === 'edit' ? 'Editar cuenta' : 'Nueva cuenta'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input placeholder="Ej: Banco Galicia, Efectivo..." value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v ?? '' })}>
                  <SelectTrigger className="w-full">
                    <span className="text-sm">{ACCOUNT_TYPES.find(t => t.value === form.type)?.label ?? 'Seleccionar'}</span>
                  </SelectTrigger>
                  <SelectContent>{ACCOUNT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Balance inicial</Label>
                <Input type="number" step="0.01" placeholder="0.00" value={form.balance} onChange={e => setForm({ ...form, balance: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Moneda</Label>
                <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v ?? '' })}>
                  <SelectTrigger className="w-full">
                    <span className="text-sm">{form.currency || 'Seleccionar'}</span>
                  </SelectTrigger>
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
                    <button key={c} type="button"
                      className={`h-6 w-6 rounded-full border-2 ${form.color === c ? 'border-gray-900' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                      onClick={() => setForm({ ...form, color: c })}
                    />
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
        </DialogContent>
      </Dialog>
    </div>
  )
}
