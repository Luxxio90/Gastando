'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ArrowDownCircle, ArrowUpCircle, Wallet, TrendingUp, Settings2, GripVertical } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Account, Investment } from '@/types'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

type CardKey = 'balance' | 'income' | 'expenses' | 'investments'
type AccountConfig = Record<Exclude<CardKey, 'investments'>, string[] | null>

const DEFAULT_ORDER: CardKey[] = ['balance', 'income', 'expenses', 'investments']
const STORAGE_KEY = (userId: string) => `gastando_cards_${userId}`

function loadStorage(userId: string) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(userId))
    if (raw) return JSON.parse(raw)
  } catch {}
  return {}
}

function saveStorage(userId: string, data: object) {
  try {
    const current = loadStorage(userId)
    localStorage.setItem(STORAGE_KEY(userId), JSON.stringify({ ...current, ...data }))
  } catch {}
}

interface RawTransaction {
  type: 'income' | 'expense'
  amount: number
  account_id: string
}

interface Props {
  accounts: Account[]
  transactions: RawTransaction[]
  investments: Investment[]
  userId: string
}

const CARD_TITLES: Record<CardKey, string> = {
  balance: 'Saldo total',
  income: 'Ingresos del mes',
  expenses: 'Gastos del mes',
  investments: 'Inversiones',
}

// Individual sortable card wrapper
function SortableCard({ id, children }: { id: string; children: (dragHandle: React.ReactNode) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  }

  const dragHandle = (
    <button
      {...attributes}
      {...listeners}
      className="p-1 rounded cursor-grab active:cursor-grabbing text-gray-200 hover:text-gray-400 transition-colors touch-none"
      aria-label="Mover tarjeta"
    >
      <GripVertical className="h-3.5 w-3.5" />
    </button>
  )

  return (
    <div ref={setNodeRef} style={style}>
      {children(dragHandle)}
    </div>
  )
}

export function DashboardCards({ accounts, transactions, investments, userId }: Props) {
  const [order, setOrder] = useState<CardKey[]>(DEFAULT_ORDER)
  const [config, setConfig] = useState<AccountConfig>({ balance: null, income: null, expenses: null })
  const [configuring, setConfiguring] = useState<Exclude<CardKey, 'investments'> | null>(null)
  const [draft, setDraft] = useState<string[]>([])

  useEffect(() => {
    const stored = loadStorage(userId)
    if (stored.order && Array.isArray(stored.order)) {
      // Merge stored order with DEFAULT_ORDER to handle new cards added later
      const merged = [
        ...stored.order.filter((k: string) => DEFAULT_ORDER.includes(k as CardKey)),
        ...DEFAULT_ORDER.filter(k => !stored.order.includes(k)),
      ] as CardKey[]
      setOrder(merged)
    }
    setConfig({
      balance: stored.balance ?? null,
      income: stored.income ?? null,
      expenses: stored.expenses ?? null,
    })
  }, [userId])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = order.indexOf(active.id as CardKey)
    const newIndex = order.indexOf(over.id as CardKey)
    const newOrder = arrayMove(order, oldIndex, newIndex)
    setOrder(newOrder)
    saveStorage(userId, { order: newOrder })
  }

  function includedIds(key: Exclude<CardKey, 'investments'>): Set<string> | null {
    return config[key] === null ? null : new Set(config[key]!)
  }

  function accountsFor(key: Exclude<CardKey, 'investments'>) {
    const ids = includedIds(key)
    return ids === null ? accounts : accounts.filter(a => ids.has(a.id))
  }

  const totalBalance = accountsFor('balance').reduce((s, a) => s + a.balance, 0)
  const incomeIds = includedIds('income')
  const expenseIds = includedIds('expenses')
  const monthIncome = transactions
    .filter(t => t.type === 'income' && (incomeIds === null || incomeIds.has(t.account_id)))
    .reduce((s, t) => s + t.amount, 0)
  const monthExpenses = transactions
    .filter(t => t.type === 'expense' && (expenseIds === null || expenseIds.has(t.account_id)))
    .reduce((s, t) => s + t.amount, 0)
  const totalInvested = investments.reduce((s, i) => s + i.current_value, 0)

  function configLabel(key: Exclude<CardKey, 'investments'>) {
    const ids = config[key]
    return ids === null ? `${accounts.length} cuenta(s)` : `${ids.length} de ${accounts.length} cuenta(s)`
  }

  function openConfig(key: Exclude<CardKey, 'investments'>) {
    setDraft(config[key] ?? accounts.map(a => a.id))
    setConfiguring(key)
  }

  function toggleAccount(id: string) {
    setDraft(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function applyConfig() {
    if (!configuring) return
    const newVal = draft.length === accounts.length ? null : draft
    const newConfig = { ...config, [configuring]: newVal }
    setConfig(newConfig)
    saveStorage(userId, { [configuring]: newVal })
    setConfiguring(null)
  }

  const GearBtn = ({ k }: { k: Exclude<CardKey, 'investments'> }) => (
    <button
      onClick={() => openConfig(k)}
      className="p-1 rounded hover:bg-gray-100 text-gray-300 hover:text-gray-600 transition-colors"
      title="Configurar cuentas"
    >
      <Settings2 className="h-3.5 w-3.5" />
    </button>
  )

  const renderCard = useCallback((key: CardKey, dragHandle: React.ReactNode) => {
    switch (key) {
      case 'balance':
        return (
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 gap-1">
              <div className="flex items-center gap-1 min-w-0">
                {dragHandle}
                <CardTitle className="text-sm font-medium text-gray-500 truncate">Saldo total</CardTitle>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <GearBtn k="balance" />
                <Wallet className="h-4 w-4 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(totalBalance)}</p>
              <p className="text-xs text-gray-400">{configLabel('balance')}</p>
            </CardContent>
          </Card>
        )
      case 'income':
        return (
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 gap-1">
              <div className="flex items-center gap-1 min-w-0">
                {dragHandle}
                <CardTitle className="text-sm font-medium text-gray-500 truncate">Ingresos del mes</CardTitle>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <GearBtn k="income" />
                <ArrowUpCircle className="h-4 w-4 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(monthIncome)}</p>
              <p className="text-xs text-gray-400">{configLabel('income')}</p>
            </CardContent>
          </Card>
        )
      case 'expenses':
        return (
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 gap-1">
              <div className="flex items-center gap-1 min-w-0">
                {dragHandle}
                <CardTitle className="text-sm font-medium text-gray-500 truncate">Gastos del mes</CardTitle>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <GearBtn k="expenses" />
                <ArrowDownCircle className="h-4 w-4 text-red-500" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-500">{formatCurrency(monthExpenses)}</p>
              <p className="text-xs text-gray-400">{configLabel('expenses')}</p>
            </CardContent>
          </Card>
        )
      case 'investments':
        return (
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2 gap-1">
              <div className="flex items-center gap-1 min-w-0">
                {dragHandle}
                <CardTitle className="text-sm font-medium text-gray-500 truncate">Inversiones</CardTitle>
              </div>
              <TrendingUp className="h-4 w-4 text-blue-600 flex-shrink-0" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalInvested)}</p>
              <p className="text-xs text-gray-400">{investments.length} activo(s)</p>
            </CardContent>
          </Card>
        )
    }
  }, [totalBalance, monthIncome, monthExpenses, totalInvested, config, accounts, investments])

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={order} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 gap-3">
            {order.map(key => (
              <SortableCard key={key} id={key}>
                {dragHandle => renderCard(key, dragHandle)}
              </SortableCard>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Account picker dialog */}
      <Dialog open={configuring !== null} onOpenChange={() => setConfiguring(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Configurar — {configuring ? CARD_TITLES[configuring] : ''}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-500 -mt-2">Seleccioná qué cuentas incluir</p>
          <div className="space-y-1.5">
            {accounts.map(a => {
              const selected = draft.includes(a.id)
              return (
                <button key={a.id} type="button" onClick={() => toggleAccount(a.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-colors',
                    selected
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                      : 'border-gray-200 text-gray-400 bg-gray-50'
                  )}
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
            <Button variant="outline" className="flex-1" onClick={() => setConfiguring(null)}>Cancelar</Button>
            <Button className="flex-1 bg-gray-900 hover:bg-gray-800" onClick={applyConfig} disabled={draft.length === 0}>
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
