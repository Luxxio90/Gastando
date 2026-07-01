'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatCurrency } from '@/lib/utils'
import { Check, Bell, PartyPopper, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { Account } from '@/types'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function urgencyColor(daysLeft: number) {
  if (daysLeft <= 0) return '#FF4D6D'
  if (daysLeft <= 5) return '#F59E0B'
  return '#3BB2F6'
}

function urgencyLabel(daysLeft: number) {
  if (daysLeft < -1) return `Vencido hace ${-daysLeft} días`
  if (daysLeft === -1) return 'Venció ayer'
  if (daysLeft === 0) return 'Vence hoy'
  if (daysLeft === 1) return 'Vence mañana'
  return `En ${daysLeft} días`
}

function progressPercent(daysLeft: number) {
  if (daysLeft <= 0) return 100
  if (daysLeft >= 30) return 0
  return Math.round((1 - daysLeft / 30) * 100)
}

interface FixedItem {
  id: string
  due_day: number
  amount: number
  description: string | null
  category?: { id: string; name: string; icon: string; color: string } | null
  group?: { id: string; name: string; color: string } | null
}

interface Props {
  token: string
  fixedItems: FixedItem[]
  accounts: Account[]
  month: number
  year: number
}

export function SharedAvisos({ token, fixedItems, accounts, month, year }: Props) {
  const router = useRouter()
  const [paid, setPaid] = useState<Set<string>>(new Set())
  const [payItem, setPayItem] = useState<FixedItem | null>(null)
  const [payAccountId, setPayAccountId] = useState('')
  const [paying, setPaying] = useState(false)

  function goMonth(delta: number) {
    let m = month + delta, y = year
    if (m < 1) { m = 12; y-- }
    if (m > 12) { m = 1; y++ }
    router.push(`/shared/${token}/avisos?month=${m}&year=${y}`)
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const alerts = fixedItems
    .filter(item => !paid.has(item.id))
    .map(item => {
      const dueDate = new Date(year, month - 1, item.due_day)
      const daysLeft = Math.round((dueDate.getTime() - today.getTime()) / 86_400_000)
      return { ...item, daysLeft }
    })
    .sort((a, b) => a.daysLeft - b.daysLeft)

  const totalPending = alerts.reduce((s, a) => s + a.amount, 0)

  function openPay(item: FixedItem) {
    setPayAccountId(accounts[0]?.id ?? '')
    setPayItem(item)
  }

  async function handlePay() {
    if (!payItem) return
    setPaying(true)
    try {
      const res = await fetch('/api/shared/fixed-item', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          item_id: payItem.id,
          status: 'paid',
          account_id: payAccountId || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setPaid(prev => new Set([...prev, payItem.id]))
      setPayItem(null)
      toast.success('Gasto marcado como pagado')
    } catch (err: any) {
      toast.error(err.message ?? 'Error al guardar')
    }
    setPaying(false)
  }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#F5F5F7' }}>
      {/* Hero */}
      <div className="relative overflow-hidden px-5 pt-8 pb-14"
        style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #FF4D6D 100%)' }}>
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 pointer-events-none" />
        <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
        <div className="relative">
          <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">Vencimientos</p>
          <h1 className="text-white text-xl font-bold mt-0.5">Avisos</h1>
          <div className="flex items-center gap-3 mt-3">
            <button onClick={() => goMonth(-1)}
              className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
              <ChevronLeft className="h-4 w-4 text-white" />
            </button>
            <span className="text-white font-semibold text-sm min-w-[120px] text-center">
              {MONTHS[month - 1]} {year}
            </span>
            <button onClick={() => goMonth(1)}
              className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors">
              <ChevronRight className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      </div>

      <div className="relative -mt-8 px-4 space-y-3">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
            <div className="h-16 w-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#00CB9620' }}>
              <PartyPopper className="h-8 w-8" style={{ color: '#00CB96' }} />
            </div>
            <div>
              <p className="font-bold text-lg text-foreground">¡Todo al día!</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-[220px]">
                No hay gastos fijos con vencimiento pendiente este mes.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Resumen */}
            <div className="rounded-xl border border-border p-4 flex items-center justify-between"
              style={{ background: 'linear-gradient(135deg, #F59E0B12 0%, transparent 60%), hsl(var(--card))' }}>
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Total pendiente</p>
                <p className="text-2xl font-bold text-foreground tabular-nums mt-0.5">{formatCurrency(totalPending)}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#F59E0B20' }}>
                  <Bell className="h-5 w-5" style={{ color: '#F59E0B' }} />
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Avisos</p>
                  <p className="text-2xl font-bold text-foreground mt-0.5">{alerts.length}</p>
                </div>
              </div>
            </div>

            {/* Alert cards */}
            {alerts.map(alert => {
              const color    = urgencyColor(alert.daysLeft)
              const label    = urgencyLabel(alert.daysLeft)
              const progress = progressPercent(alert.daysLeft)
              const iconColor = alert.category?.color ?? '#7C4DFF'
              return (
                <div key={alert.id} className="bg-card border border-border rounded-xl overflow-hidden">
                  {/* Progress bar */}
                  <div className="h-1 bg-muted/40">
                    <div className="h-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: color }} />
                  </div>

                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Ícono */}
                      <div className="h-10 w-10 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                        style={{ backgroundColor: iconColor + '22' }}>
                        {alert.category?.icon ?? '📋'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-foreground truncate">
                              {alert.category?.name ?? 'Sin categoría'}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Gasto fijo · vence el día {alert.due_day}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              {alert.group?.name && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                                  style={{ backgroundColor: (alert.group.color ?? '#7C4DFF') + '20', color: alert.group.color ?? '#7C4DFF' }}>
                                  {alert.group.name}
                                </span>
                              )}
                              {alert.description && (
                                <span className="text-[11px] text-muted-foreground truncate">{alert.description}</span>
                              )}
                            </div>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0"
                            style={{ color, backgroundColor: color + '18', border: `1px solid ${color}40` }}>
                            {label}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                          <span className="font-bold text-base tabular-nums text-foreground">
                            {formatCurrency(alert.amount)}
                          </span>
                          <Button
                            size="sm"
                            onClick={() => openPay(alert)}
                            className="text-xs font-semibold h-7 px-3"
                            style={{ backgroundColor: '#00CB9620', color: '#00CB96', border: '1px solid #00CB9645' }}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Pagar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* Dialog confirmación de pago */}
      <Dialog open={!!payItem} onOpenChange={open => { if (!open) setPayItem(null) }}>
        <DialogContent className="sm:max-w-sm p-0 gap-0 border-border">
          <div className="px-5 pt-5 pb-4 border-b border-border"
            style={{ background: 'linear-gradient(135deg, #00CB9618 0%, transparent 100%)' }}>
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#00CB9618' }}>
                <Check className="h-4 w-4" style={{ color: '#00CB96' }} />
              </div>
              <DialogTitle className="text-base font-semibold">Confirmar pago</DialogTitle>
            </div>
            {payItem && (
              <p className="text-sm text-muted-foreground mt-2">
                {payItem.category?.icon} {payItem.category?.name ?? 'Sin categoría'} — {formatCurrency(payItem.amount)}
              </p>
            )}
          </div>

          <div className="p-5 space-y-4">
            {accounts.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Cuenta de pago <span className="normal-case font-normal text-muted-foreground/60">(opcional — genera gasto)</span>
                </label>
                <div className="space-y-1.5">
                  <button type="button"
                    onClick={() => setPayAccountId('')}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm transition-all text-left"
                    style={payAccountId === ''
                      ? { backgroundColor: '#7C4DFF18', borderColor: '#7C4DFF55' }
                      : { backgroundColor: 'transparent', borderColor: 'hsl(var(--border))' }}>
                    <span className="text-muted-foreground text-sm">Sin cuenta</span>
                  </button>
                  {accounts.map(a => (
                    <button key={a.id} type="button"
                      onClick={() => setPayAccountId(a.id)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm transition-all text-left"
                      style={payAccountId === a.id
                        ? { backgroundColor: a.color + '18', borderColor: a.color + '55' }
                        : { backgroundColor: 'transparent', borderColor: 'hsl(var(--border))' }}>
                      <div className="w-1 h-7 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate text-sm">{a.name}</p>
                        <p className="text-[11px] text-muted-foreground tabular-nums">{formatCurrency(a.balance, a.currency)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setPayItem(null)}>Cancelar</Button>
              <Button disabled={paying} className="flex-1 font-semibold" onClick={handlePay}
                style={{ background: 'linear-gradient(135deg, #00CB96 0%, #00E6A6 100%)', color: '#fff', border: 'none' }}>
                {paying ? 'Guardando...' : 'Confirmar pago'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
