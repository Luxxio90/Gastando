'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Account } from '@/types'
import { formatCurrency, todayLocalStr } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import {
  Plus, MoreVertical, ChevronRight, Settings2, GripVertical,
  Wallet, Landmark, CreditCard, PiggyBank, Banknote, Check, Eye, EyeOff, Trash2,
} from 'lucide-react'
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
  { value: 'cash',        label: 'Efectivo',           icon: Wallet },
  { value: 'bank',        label: 'Cuenta bancaria',    icon: Landmark },
  { value: 'credit_card', label: 'Tarjeta de crédito', icon: CreditCard },
  { value: 'savings',     label: 'Caja de ahorro',     icon: PiggyBank },
  { value: 'other',       label: 'Otra',               icon: Banknote },
]

const COLORS = ['#7C4DFF', '#00CB96', '#3BB2F6', '#FF4D6D', '#F59E0B', '#EC4899', '#10b981', '#f97316']

type FormState = { name: string; type: string; balance: string; currency: string; color: string }
const emptyForm: FormState = { name: '', type: 'bank', balance: '', currency: 'ARS', color: COLORS[0] }

const CARDS_KEY  = (uid: string) => `gastando_cards_${uid}`
const ORDER_KEY  = (uid: string) => `gastando_accounts_order_${uid}`
const HIDE_KEY   = 'gastando_hide_balances'

interface Props { accounts: Account[]; userId: string }

function AccountTypeIcon({ type, color }: { type: string; color: string }) {
  const T = ACCOUNT_TYPES.find(t => t.value === type)?.icon ?? Banknote
  return (
    <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: color + '22' }}>
      <T className="h-5 w-5" style={{ color }} />
    </div>
  )
}

function SortableAccountCard({ account, onEdit, onDelete, hidden }: { account: Account; onEdit: (a: Account) => void; onDelete: (id: string) => void; hidden: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: account.id })

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
  const typeLabel = ACCOUNT_TYPES.find(t => t.value === account.type)?.label ?? ''

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className="relative rounded-xl border border-border overflow-hidden transition-all hover:shadow-lg hover:shadow-black/20"
        style={{
          borderLeftColor: account.color,
          borderLeftWidth: 3,
          background: `linear-gradient(90deg, ${account.color}12 0%, transparent 35%), hsl(var(--card))`,
        }}
      >
        <Link href={`/accounts/${account.id}`} className="flex items-center gap-3 pl-3 pr-10 py-3.5">
          <button
            {...attributes} {...listeners}
            className="text-muted-foreground/25 hover:text-muted-foreground/60 cursor-grab active:cursor-grabbing touch-none flex-shrink-0 p-0.5"
            aria-label="Mover"
            onClick={e => e.preventDefault()}
          >
            <GripVertical className="h-4 w-4" />
          </button>

          <AccountTypeIcon type={account.type} color={account.color} />

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground truncate">{account.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{typeLabel} · {account.currency}</p>
          </div>

          <div className="text-right flex-shrink-0">
            <p className="font-bold text-sm tabular-nums text-foreground">{hidden ? '••••••' : formatCurrency(account.balance, account.currency)}</p>
          </div>
        </Link>

        <div className="absolute top-1/2 -translate-y-1/2 right-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-muted/60 transition-colors">
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(account)}>Editar</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-500" onClick={() => onDelete(account.id)}>Eliminar cuenta</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}

export function AccountsList({ accounts, userId }: Props) {
  const [localAccounts, setLocalAccounts]     = useState<Account[]>(accounts)
  const [order, setOrder]                     = useState<string[]>([])
  const [mode, setMode]                       = useState<'create' | 'edit' | null>(null)
  const [editing, setEditing]                 = useState<Account | null>(null)
  const [loading, setLoading]                 = useState(false)
  const [form, setForm]                       = useState<FormState>(emptyForm)
  const [balanceIds, setBalanceIds]           = useState<string[] | null>(null)
  const [balanceConfigOpen, setBalanceConfigOpen] = useState(false)
  const [draft, setDraft]                     = useState<string[]>([])
  const [hidden, setHidden]                   = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const router  = useRouter()
  const supabase = createClient()

  useEffect(() => { setLocalAccounts(accounts) }, [accounts])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(ORDER_KEY(userId))
      if (stored) {
        const parsed: string[] = JSON.parse(stored)
        const known = new Set(accounts.map(a => a.id))
        setOrder([...parsed.filter(id => known.has(id)), ...accounts.map(a => a.id).filter(id => !parsed.includes(id))])
      } else {
        setOrder(accounts.map(a => a.id))
      }
    } catch { setOrder(accounts.map(a => a.id)) }

    try {
      const raw = localStorage.getItem(CARDS_KEY(userId))
      if (raw) setBalanceIds(JSON.parse(raw).balance ?? null)
    } catch {}

    try { setHidden(localStorage.getItem(HIDE_KEY) === 'true') } catch {}
  }, [userId, accounts.length])

  function toggleHidden() {
    const next = !hidden
    setHidden(next)
    try { localStorage.setItem(HIDE_KEY, String(next)) } catch {}
  }

  const sortedAccounts = order.map(id => localAccounts.find(a => a.id === id)).filter(Boolean) as Account[]

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const newOrder = arrayMove(order, order.indexOf(active.id as string), order.indexOf(over.id as string))
    setOrder(newOrder)
    localStorage.setItem(ORDER_KEY(userId), JSON.stringify(newOrder))
  }

  const includedAccounts = balanceIds === null ? localAccounts : localAccounts.filter(a => balanceIds.includes(a.id))
  const totalBalance = includedAccounts.reduce((s, a) => s + a.balance, 0)

  function openBalanceConfig() { setDraft(balanceIds ?? localAccounts.map(a => a.id)); setBalanceConfigOpen(true) }
  function applyBalanceConfig() {
    const val = draft.length === accounts.length ? null : draft
    setBalanceIds(val)
    try {
      const raw = localStorage.getItem(CARDS_KEY(userId))
      localStorage.setItem(CARDS_KEY(userId), JSON.stringify({ ...(raw ? JSON.parse(raw) : {}), balance: val }))
    } catch {}
    setBalanceConfigOpen(false)
  }

  function openCreate() { setForm(emptyForm); setEditing(null); setMode('create') }
  function openEdit(account: Account) {
    setForm({ name: account.name, type: account.type, balance: account.balance.toString(), currency: account.currency, color: account.color })
    setEditing(account); setMode('edit')
  }
  function closeDialog() { setMode(null); setEditing(null); setForm(emptyForm) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true)
    if (mode === 'create') {
      const { error } = await supabase.from('accounts').insert({ user_id: userId, name: form.name, type: form.type, balance: parseFloat(form.balance) || 0, currency: form.currency, color: form.color })
      if (error) toast.error('Error al crear la cuenta')
      else { toast.success('Cuenta creada'); closeDialog(); router.refresh() }
    } else if (mode === 'edit' && editing) {
      const newBalance = parseFloat(form.balance) || 0
      const diff = newBalance - editing.balance
      const { error } = await supabase.from('accounts').update({ name: form.name, type: form.type, balance: newBalance, currency: form.currency, color: form.color }).eq('id', editing.id)
      if (error) { toast.error('Error al guardar los cambios'); setLoading(false); return }

      if (diff !== 0) {
        const adjType = diff > 0 ? 'income' : 'expense'
        const { data: cats } = await supabase.from('categories').select('id')
          .eq('name', 'Ajuste de saldo').eq('type', adjType)
          .or(`user_id.eq.${userId},is_default.eq.true`).limit(1)
        let catId: string | null = cats?.[0]?.id ?? null
        if (!catId) {
          const { data: newCat } = await supabase.from('categories').insert({
            user_id: userId, name: 'Ajuste de saldo', icon: '⚖️', color: '#F59E0B', type: adjType, is_default: false,
          }).select('id').single()
          catId = newCat?.id ?? null
        }
        if (catId) {
          await supabase.from('transactions').insert({
            user_id: userId, account_id: editing.id, category_id: catId,
            type: adjType, amount: Math.abs(diff),
            description: 'Ajuste de saldo',
            date: todayLocalStr(), notes: null,
          })
        }
      }

      setLocalAccounts(prev => prev.map(a => a.id === editing.id
        ? { ...a, name: form.name, type: form.type, balance: newBalance, currency: form.currency, color: form.color }
        : a
      ))
      toast.success('Cuenta actualizada'); closeDialog(); router.refresh()
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('accounts').delete().eq('id', id)
    if (error) toast.error('No se puede eliminar (tiene transacciones asociadas)')
    else { toast.success('Cuenta eliminada'); setOrder(prev => prev.filter(x => x !== id)); router.refresh() }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cuentas</h1>
          <div className="flex items-center gap-2.5 mt-0.5">
            <p className="text-sm text-muted-foreground">
              Balance total:{' '}
              <span className="font-bold text-foreground tabular-nums">{hidden ? '••••••' : formatCurrency(totalBalance)}</span>
            </p>
            <button
              onClick={toggleHidden}
              className="p-1 rounded hover:bg-muted text-muted-foreground/40 hover:text-muted-foreground transition-colors"
              title={hidden ? 'Mostrar saldos' : 'Ocultar saldos'}
            >
              {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button
              onClick={openBalanceConfig}
              className="p-1 rounded hover:bg-muted text-muted-foreground/40 hover:text-muted-foreground transition-colors"
            >
              <Settings2 className="h-4 w-4" />
            </button>
            {balanceIds !== null && (
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: '#3BB2F620', color: '#3BB2F6' }}
              >
                {balanceIds.length}/{accounts.length}
              </span>
            )}
          </div>
        </div>
        <Button
          onClick={openCreate}
          size="sm"
          className="font-semibold"
          style={{ background: 'linear-gradient(135deg, #7C4DFF 0%, #9C6DFF 100%)', color: '#fff', border: 'none' }}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Nueva cuenta
        </Button>
      </div>

      {/* Lista de cuentas */}
      {accounts.length === 0 ? (
        <div className="text-center text-muted-foreground py-12 border-2 border-dashed border-border rounded-xl text-sm">
          No tenés cuentas aún. ¡Creá una!
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={order} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 gap-2.5">
              {sortedAccounts.map(a => (
                <SortableAccountCard key={a.id} account={a} onEdit={openEdit} onDelete={id => setPendingDeleteId(id)} hidden={hidden} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Balance config dialog */}
      <Dialog open={balanceConfigOpen} onOpenChange={setBalanceConfigOpen}>
        <DialogContent className="sm:max-w-xs p-0 gap-0 border-border">
          <div className="px-5 pt-5 pb-4 border-b border-border" style={{ background: 'linear-gradient(135deg, #3BB2F618 0%, transparent 100%)' }}>
            <DialogTitle className="text-base font-semibold">Configurar balance total</DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Seleccioná qué cuentas incluir</p>
          </div>
          <div className="p-4 space-y-2">
            {accounts.map(a => {
              const selected = draft.includes(a.id)
              return (
                <button
                  key={a.id} type="button"
                  onClick={() => setDraft(prev => prev.includes(a.id) ? prev.filter(x => x !== a.id) : [...prev, a.id])}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm transition-all"
                  style={selected
                    ? { borderColor: a.color + '60', backgroundColor: a.color + '12', color: 'hsl(var(--foreground))' }
                    : { borderColor: 'hsl(var(--border))', backgroundColor: 'transparent', color: 'hsl(var(--muted-foreground))' }
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />
                    <span className="font-medium">{a.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs tabular-nums">{formatCurrency(a.balance, a.currency)}</span>
                    {selected && <Check className="h-3.5 w-3.5 flex-shrink-0" style={{ color: a.color }} />}
                  </div>
                </button>
              )
            })}
          </div>
          <div className="flex gap-2 px-4 pb-4">
            <Button variant="outline" className="flex-1" onClick={() => setBalanceConfigOpen(false)}>Cancelar</Button>
            <Button
              className="flex-1 font-semibold"
              style={{ background: 'linear-gradient(135deg, #7C4DFF 0%, #9C6DFF 100%)', color: '#fff', border: 'none' }}
              onClick={applyBalanceConfig}
              disabled={draft.length === 0}
            >
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create / Edit account dialog */}
      <Dialog open={mode !== null} onOpenChange={closeDialog}>
        <DialogContent className="sm:max-w-md p-0 gap-0 border-border">
          {/* Header */}
          <div
            className="px-5 pt-5 pb-4 border-b border-border"
            style={{ background: 'linear-gradient(135deg, #7C4DFF18 0%, #3BB2F608 100%)' }}
          >
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#7C4DFF20' }}>
                <Landmark className="h-4 w-4" style={{ color: '#7C4DFF' }} />
              </div>
              <DialogTitle className="text-base font-semibold">
                {mode === 'edit' ? 'Editar cuenta' : 'Nueva cuenta'}
              </DialogTitle>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            {/* Nombre */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Nombre</label>
              <Input
                placeholder="Ej: Banco Galicia, Efectivo..."
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
                className="bg-muted/40 border-border/60"
              />
            </div>

            {/* Tipo + Balance */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Tipo</label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v ?? '' })}>
                  <SelectTrigger className="w-full bg-muted/40 border-border/60">
                    <span className="text-sm">{ACCOUNT_TYPES.find(t => t.value === form.type)?.label ?? 'Seleccionar'}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                  {mode === 'edit' ? 'Nuevo saldo' : 'Balance'}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                  <Input
                    type="number" step="0.01" placeholder="0.00"
                    value={form.balance}
                    onChange={e => setForm({ ...form, balance: e.target.value })}
                    className="pl-6 bg-muted/40 border-border/60 font-semibold"
                  />
                </div>
                {mode === 'edit' && editing && (() => {
                  const diff = (parseFloat(form.balance) || 0) - editing.balance
                  if (diff === 0) return null
                  return (
                    <p className="text-[11px] font-medium" style={{ color: diff > 0 ? '#00CB96' : '#FF4D6D' }}>
                      Se generará un ajuste de {diff > 0 ? '+' : ''}{formatCurrency(diff, editing.currency)}
                    </p>
                  )
                })()}
              </div>
            </div>

            {/* Moneda + Color */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Moneda</label>
                <Select value={form.currency} onValueChange={v => setForm({ ...form, currency: v ?? '' })}>
                  <SelectTrigger className="w-full bg-muted/40 border-border/60">
                    <span className="text-sm">{form.currency || 'Seleccionar'}</span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ARS">ARS (Peso)</SelectItem>
                    <SelectItem value="USD">USD (Dólar)</SelectItem>
                    <SelectItem value="EUR">EUR (Euro)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Color</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {COLORS.map(c => (
                    <button
                      key={c} type="button"
                      onClick={() => setForm({ ...form, color: c })}
                      className="h-6 w-6 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                      style={{ backgroundColor: c, boxShadow: form.color === c ? `0 0 0 2px hsl(var(--background)), 0 0 0 4px ${c}` : 'none' }}
                    >
                      {form.color === c && <Check className="h-3 w-3 text-white" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Botones */}
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={closeDialog}>Cancelar</Button>
              <Button
                type="submit" disabled={loading}
                className="flex-1 font-semibold"
                style={{ background: 'linear-gradient(135deg, #7C4DFF 0%, #9C6DFF 100%)', color: '#fff', border: 'none' }}
              >
                {loading ? 'Guardando...' : mode === 'edit' ? 'Guardar cambios' : 'Crear cuenta'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation: delete account */}
      <Dialog open={!!pendingDeleteId} onOpenChange={() => setPendingDeleteId(null)}>
        <DialogContent className="sm:max-w-xs p-0 gap-0 border-border overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-border" style={{ background: 'linear-gradient(135deg, #FF4D6D12 0%, transparent 100%)' }}>
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FF4D6D20' }}>
                <Trash2 className="h-4 w-4" style={{ color: '#FF4D6D' }} />
              </div>
              <DialogTitle className="text-base font-semibold">Eliminar cuenta</DialogTitle>
            </div>
          </div>
          <div className="px-5 py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              ¿Eliminar esta cuenta? Esta acción no se puede deshacer. Si tiene transacciones asociadas no se podrá eliminar.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setPendingDeleteId(null)}>Cancelar</Button>
              <Button
                className="flex-1 font-semibold"
                onClick={() => { if (pendingDeleteId) { handleDelete(pendingDeleteId); setPendingDeleteId(null) } }}
                style={{ backgroundColor: '#FF4D6D', color: '#fff', border: 'none' }}
              >
                Eliminar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
