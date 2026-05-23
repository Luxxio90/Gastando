'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Check, CreditCard, ChevronRight, Bell, PartyPopper, AlertTriangle } from 'lucide-react'
import type { Account, CreditCardNetwork } from '@/types'
import { PayFixedExpenseDialog, type PendingPayItem } from '@/components/budgets/pay-fixed-expense-dialog'

// ── Types ────────────────────────────────────────────────────────────────────

type RawFixed = {
  id: string
  due_day: number
  amount: number
  description: string | null
  category_id?: string | null
  category?: { id: string; name: string; icon: string; color: string } | null
  group?: { id: string; name: string; color: string } | null
}

type RawCard = {
  id: string
  due_date: string
  card: { id: string; name: string; network: CreditCardNetwork; account_id: string | null }
  total: number
}

type ExceededBudget = {
  id: string
  name: string
  exceeded_at: string
  track_account_id: string
}

interface Props {
  fixedExpenses: RawFixed[]
  cardMonths: RawCard[]
  exceededBudgets: ExceededBudget[]
  userId: string
  accounts: Account[]
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const NETWORK_GRADIENT: Record<CreditCardNetwork, string> = {
  visa:       'linear-gradient(135deg, #1a237e 0%, #1565C0 100%)',
  mastercard: 'linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%)',
  amex:       'linear-gradient(135deg, #003087 0%, #0066CC 100%)',
  nacion:     'linear-gradient(135deg, #0c4a8a 0%, #0e6eb8 100%)',
  provincia:  'linear-gradient(135deg, #2d1b69 0%, #4c1d95 100%)',
  modo:       'linear-gradient(135deg, #4c1d95 0%, #6d28d9 100%)',
  cabal:      'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
  naranja:    'linear-gradient(135deg, #9a3412 0%, #c2410c 100%)',
  other:      'linear-gradient(135deg, #1f2937 0%, #374151 100%)',
}

function urgencyColor(daysLeft: number): string {
  if (daysLeft <= 0) return '#FF4D6D'
  if (daysLeft <= 5) return '#F59E0B'
  return '#3BB2F6'
}

function urgencyLabel(daysLeft: number): string {
  if (daysLeft < -1) return `Vencido hace ${-daysLeft} días`
  if (daysLeft === -1) return 'Venció ayer'
  if (daysLeft === 0) return 'Vence hoy'
  if (daysLeft === 1) return 'Vence mañana'
  return `En ${daysLeft} días`
}

// Bar fills from 0% (30+ days away) to 100% (due today or overdue)
function progressPercent(daysLeft: number): number {
  if (daysLeft <= 0) return 100
  if (daysLeft >= 30) return 0
  return Math.round((1 - daysLeft / 30) * 100)
}

function parseDueDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatDueDate(dateStr: string): string {
  return parseDueDate(dateStr).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })
}

// ── Alert card ────────────────────────────────────────────────────────────────

type FixedAlert = {
  type: 'fixed'
  id: string
  name: string
  icon: string
  iconColor: string
  description: string | null
  groupName: string | null
  groupColor: string | null
  amount: number
  dueDay: number
  daysLeft: number
}

type CardAlert = {
  type: 'card'
  id: string
  cardId: string
  name: string
  network: CreditCardNetwork
  dueDate: string
  daysLeft: number
  total: number
  accountId: string | null
}

type Alert = FixedAlert | CardAlert

function AlertCardInner({
  alert,
  marking,
  onPay,
  onPayCard,
}: {
  alert: Alert
  marking: boolean
  onPay: (alert: FixedAlert) => void
  onPayCard: (alert: CardAlert) => void
}) {
  const color    = urgencyColor(alert.daysLeft)
  const label    = urgencyLabel(alert.daysLeft)
  const progress = progressPercent(alert.daysLeft)
  const amount   = alert.type === 'fixed' ? alert.amount : alert.total

  return (
    <>
      {/* Progress bar */}
      <div className="h-1 bg-muted/40">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${progress}%`, backgroundColor: color }}
        />
      </div>

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          {alert.type === 'fixed' ? (
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center text-base flex-shrink-0"
              style={{ backgroundColor: alert.iconColor + '22' }}
            >
              {alert.icon}
            </div>
          ) : (
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: NETWORK_GRADIENT[alert.network] }}
            >
              <CreditCard className="h-4 w-4 text-white" />
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">{alert.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {alert.type === 'fixed'
                    ? `Gasto fijo · vence el día ${alert.dueDay}`
                    : `Tarjeta · vence el ${formatDueDate(alert.dueDate)}`}
                </p>
                {alert.type === 'fixed' && (
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {alert.groupName && (
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: (alert.groupColor ?? '#7C4DFF') + '20',
                          color: alert.groupColor ?? '#7C4DFF',
                        }}
                      >
                        {alert.groupName}
                      </span>
                    )}
                    {alert.description && (
                      <span className="text-[11px] text-muted-foreground truncate">{alert.description}</span>
                    )}
                  </div>
                )}
              </div>
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0"
                style={{ color, backgroundColor: color + '18', border: `1px solid ${color}40` }}
              >
                {label}
              </span>
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
              <span className="font-bold text-base tabular-nums text-foreground">
                {formatCurrency(amount)}
              </span>
              {alert.type === 'fixed' ? (
                <Button
                  size="sm"
                  disabled={marking}
                  onClick={(e) => { e.stopPropagation(); onPay(alert as FixedAlert) }}
                  className="text-xs font-semibold h-7 px-3"
                  style={{ backgroundColor: '#00CB9620', color: '#00CB96', border: '1px solid #00CB9645' }}
                >
                  <Check className="h-3 w-3 mr-1" />
                  {marking ? 'Guardando...' : 'Pagar'}
                </Button>
              ) : (alert as CardAlert).accountId ? (
                <Button
                  size="sm"
                  disabled={marking}
                  onClick={(e) => { e.stopPropagation(); onPayCard(alert as CardAlert) }}
                  className="text-xs font-semibold h-7 px-3"
                  style={{ backgroundColor: '#00CB9620', color: '#00CB96', border: '1px solid #00CB9645' }}
                >
                  <Check className="h-3 w-3 mr-1" />
                  {marking ? 'Guardando...' : 'Pagar'}
                </Button>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold h-7 px-3 rounded-md border border-input text-muted-foreground">
                  Ver tarjeta <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function AlertCard({ alert, marking, onPay, onPayCard }: { alert: Alert; marking: boolean; onPay: (alert: FixedAlert) => void; onPayCard: (alert: CardAlert) => void }) {
  if (alert.type === 'card' && !(alert as CardAlert).accountId) {
    return (
      <a href="/tarjetas" className="block bg-card border border-border rounded-xl overflow-hidden">
        <AlertCardInner alert={alert} marking={marking} onPay={onPay} onPayCard={onPayCard} />
      </a>
    )
  }
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <AlertCardInner alert={alert} marking={marking} onPay={onPay} onPayCard={onPayCard} />
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
      <div
        className="h-16 w-16 rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: '#00CB9620' }}
      >
        <PartyPopper className="h-8 w-8" style={{ color: '#00CB96' }} />
      </div>
      <div>
        <p className="font-bold text-lg text-foreground">¡Todo al día!</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-[220px]">
          No hay gastos fijos ni tarjetas con vencimiento pendiente este mes.
        </p>
      </div>
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────

export function AvisosView({ fixedExpenses, cardMonths, exceededBudgets, userId, accounts }: Props) {
  const [paid, setPaid]           = useState<Set<string>>(new Set())
  const [marking, setMarking]     = useState<Set<string>>(new Set())
  const [pendingPay, setPendingPay] = useState<PendingPayItem | null>(null)
  const supabase = createClient()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayDay = today.getDate()

  // Build unified alert list
  const fixedAlerts: Alert[] = fixedExpenses
    .filter(item => !paid.has(item.id))
    .map(item => ({
      type:       'fixed',
      id:         item.id,
      name:       item.category?.name ?? 'Sin categoría',
      icon:       item.category?.icon ?? '📋',
      iconColor:  item.category?.color ?? '#7C4DFF',
      description: item.description,
      groupName:  item.group?.name ?? null,
      groupColor: item.group?.color ?? null,
      amount:     item.amount,
      dueDay:     item.due_day,
      daysLeft:   item.due_day - todayDay,
    }))

  const cardAlerts: Alert[] = cardMonths
    .filter(cm => !paid.has('card:' + cm.id))
    .map(cm => {
      const dueDate = parseDueDate(cm.due_date)
      const daysLeft = Math.round((dueDate.getTime() - today.getTime()) / 86_400_000)
      return {
        type:      'card',
        id:        cm.id,
        cardId:    cm.card.id,
        name:      cm.card.name,
        network:   cm.card.network,
        dueDate:   cm.due_date,
        daysLeft,
        total:     cm.total,
        accountId: cm.card.account_id ?? null,
      }
    })

  // Sort: most overdue first, then by closest due date
  const allAlerts = [...fixedAlerts, ...cardAlerts].sort((a, b) => a.daysLeft - b.daysLeft)

  const totalPending = allAlerts.reduce(
    (s, a) => s + (a.type === 'fixed' ? a.amount : a.total), 0
  )

  async function handlePayCard(alert: CardAlert) {
    if (!alert.accountId) return
    const account = accounts.find(a => a.id === alert.accountId)
    if (!account) return
    setMarking(prev => new Set([...prev, alert.id]))

    let catId: string | null = null
    const { data: cats } = await supabase.from('categories').select('id').eq('name', 'Tarjeta de crédito').eq('type', 'expense').or(`user_id.eq.${userId},is_default.eq.true`).limit(1)
    if (cats && cats.length > 0) {
      catId = cats[0].id
    } else {
      const { data: newCat } = await supabase.from('categories').insert({ user_id: userId, name: 'Tarjeta de crédito', icon: '💳', color: '#6366f1', type: 'expense', is_default: false }).select('id').single()
      catId = newCat?.id ?? null
    }

    if (!catId) { toast.error('Error al preparar categoría'); setMarking(prev => { const s = new Set(prev); s.delete(alert.id); return s }); return }

    const { data: txData, error: txError } = await supabase.from('transactions').insert({
      user_id: userId, account_id: alert.accountId, category_id: catId,
      type: 'expense', amount: alert.total,
      description: `Pago tarjeta: ${alert.name}`,
      date: new Date().toISOString().split('T')[0], notes: null,
    }).select('id').single()
    const [r2, r3] = await Promise.all([
      supabase.from('accounts').update({ balance: account.balance - alert.total }).eq('id', alert.accountId),
      supabase.from('credit_card_months').update({
        status: 'paid', paid_at: new Date().toISOString(),
        account_id: alert.accountId, paid_amount: alert.total,
        transaction_id: txData?.id ?? null,
      }).eq('id', alert.id),
    ])

    setMarking(prev => { const s = new Set(prev); s.delete(alert.id); return s })
    if (txError || r2.error || r3.error) { toast.error('Error al registrar el pago'); return }
    setPaid(prev => new Set([...prev, 'card:' + alert.id]))
    toast.success(`Pago de ${formatCurrency(alert.total)} debitado de ${account.name}`)
  }

  function openPayDialog(alert: FixedAlert) {
    const raw = fixedExpenses.find(f => f.id === alert.id)
    setPendingPay({
      id: alert.id,
      amount: alert.amount,
      description: alert.description,
      category_id: raw?.category_id ?? raw?.category?.id ?? null,
      category: raw?.category
        ? { name: raw.category.name, icon: raw.category.icon, color: raw.category.color }
        : null,
    })
  }

  if (allAlerts.length === 0 && exceededBudgets.length === 0) return <EmptyState />

  return (
    <div className="space-y-3">
      {/* Presupuestos superados */}
      {exceededBudgets.length > 0 && (
        <div className="space-y-2">
          {exceededBudgets.map(b => {
            const account = accounts.find(a => a.id === b.track_account_id)
            const exceededDate = new Date(b.exceeded_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })
            return (
              <a key={b.id} href="/budgets" className="block">
                <div
                  className="bg-card rounded-xl border overflow-hidden"
                  style={{ borderColor: '#FF4D6D40' }}
                >
                  <div className="h-1" style={{ backgroundColor: '#FF4D6D' }} />
                  <div className="p-4 flex items-start gap-3">
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: '#FF4D6D18' }}
                    >
                      <AlertTriangle className="h-5 w-5" style={{ color: '#FF4D6D' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm text-foreground">{b.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {account?.name ?? 'Cuenta'} · superado el {exceededDate}
                          </p>
                        </div>
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0"
                          style={{ color: '#FF4D6D', backgroundColor: '#FF4D6D18', border: '1px solid #FF4D6D40' }}
                        >
                          Superado
                        </span>
                      </div>
                      <div className="mt-3 pt-3 border-t border-border/50 flex justify-end">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                          Ver distribución <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </a>
            )
          })}
        </div>
      )}

      {/* Summary */}
      <div
        className="rounded-xl border border-border p-4 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, #7C4DFF12 0%, transparent 60%), hsl(var(--card))' }}
      >
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Total pendiente</p>
          <p className="text-2xl font-bold text-foreground tabular-nums mt-0.5">{formatCurrency(totalPending)}</p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: '#7C4DFF20' }}
          >
            <Bell className="h-5 w-5" style={{ color: '#7C4DFF' }} />
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Avisos</p>
            <p className="text-2xl font-bold text-foreground mt-0.5">{allAlerts.length}</p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {allAlerts.map(alert => (
        <AlertCard
          key={alert.id}
          alert={alert}
          marking={marking.has(alert.id)}
          onPay={openPayDialog}
          onPayCard={handlePayCard}
        />
      ))}

      <PayFixedExpenseDialog
        open={!!pendingPay}
        onClose={() => setPendingPay(null)}
        item={pendingPay}
        accounts={accounts}
        userId={userId}
        onPaid={(id) => setPaid(prev => new Set([...prev, id]))}
      />
    </div>
  )
}
