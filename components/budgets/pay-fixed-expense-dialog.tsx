'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Account, Responsible } from '@/types'
import { formatCurrency, todayLocalStr } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Check } from 'lucide-react'

export type PendingPayItem = {
  id: string
  amount: number
  description: string | null
  category_id: string | null
  category?: { name: string; icon: string; color: string } | null
}

interface Props {
  open: boolean
  onClose: () => void
  item: PendingPayItem | null
  accounts: Account[]
  responsibles: Responsible[]
  userId: string
  onPaid: (itemId: string) => void
}

export function PayFixedExpenseDialog({ open, onClose, item, accounts, responsibles, userId, onPaid }: Props) {
  const supabase = createClient()
  const [accountId, setAccountId]         = useState('')
  const [responsibleId, setResponsibleId] = useState('')
  const [loading, setLoading]             = useState(false)

  async function handleConfirm() {
    if (!item || !accountId) return
    if (responsibles.length > 0 && !responsibleId) {
      toast.error('Seleccioná un encargado')
      return
    }
    setLoading(true)
    try {
      const today = todayLocalStr()
      const desc  = item.description || item.category?.name || 'Gasto fijo'

      const [r1, r2] = await Promise.all([
        supabase.from('transactions').insert({
          user_id: userId,
          account_id: accountId,
          category_id: item.category_id as string,
          type: 'expense',
          amount: item.amount,
          description: desc,
          date: today,
          notes: null,
          responsible_party_id: responsibleId || null,
        }),
        supabase.from('fixed_expense_items').update({ status: 'paid' }).eq('id', item.id),
      ])

      if (r1.error || r2.error) {
        toast.error('Error al registrar el pago')
      } else {
        toast.success('Pago registrado')
        onPaid(item.id)
        setAccountId('')
        setResponsibleId('')
        onClose()
      }
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setAccountId('')
    setResponsibleId('')
    onClose()
  }

  if (!item) return null

  const catName  = item.category?.name  ?? 'Sin categoría'
  const catIcon  = item.category?.icon  ?? '📋'
  const catColor = item.category?.color ?? '#7C4DFF'
  const canConfirm = !!accountId && (responsibles.length === 0 || !!responsibleId)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xs p-0 gap-0 border-border overflow-hidden">
        {/* Header */}
        <div
          className="px-5 pt-5 pb-4 border-b border-border"
          style={{ background: 'linear-gradient(135deg, #00CB9618 0%, transparent 100%)' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center text-base"
              style={{ backgroundColor: catColor + '20' }}>
              {catIcon}
            </div>
            <DialogTitle className="text-base font-semibold text-foreground">
              Registrar pago
            </DialogTitle>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Item summary */}
          <div className="bg-muted/40 rounded-xl px-3 py-2.5 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{catName}</p>
              {item.description && (
                <p className="text-[11px] text-muted-foreground truncate">{item.description}</p>
              )}
            </div>
            <span className="text-sm font-bold tabular-nums flex-shrink-0 ml-2" style={{ color: '#FF4D6D' }}>
              -{formatCurrency(item.amount)}
            </span>
          </div>

          {/* Account selector */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              ¿Desde qué cuenta?
            </p>
            <div className="space-y-1.5">
              {accounts.map(a => {
                const active = accountId === a.id
                return (
                  <button
                    key={a.id} type="button"
                    onClick={() => setAccountId(a.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm transition-all text-left"
                    style={active
                      ? { backgroundColor: a.color + '18', borderColor: a.color + '55' }
                      : { backgroundColor: 'transparent', borderColor: 'hsl(var(--border))' }
                    }
                  >
                    <div className="w-1 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate text-sm">{a.name}</p>
                      <p className="text-[11px] text-muted-foreground tabular-nums">
                        {formatCurrency(a.balance, a.currency)}
                      </p>
                    </div>
                    {active && <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Responsible selector */}
          {responsibles.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                Encargado <span className="normal-case font-semibold text-red-500">*</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {responsibles.map(r => {
                  const active = responsibleId === r.id
                  return (
                    <button
                      key={r.id} type="button"
                      onClick={() => setResponsibleId(active ? '' : r.id)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all"
                      style={active
                        ? { backgroundColor: r.color + '20', borderColor: r.color + '60', color: 'hsl(var(--foreground))' }
                        : { borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }
                      }
                    >
                      <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
                      {r.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              className="flex-1 font-semibold"
              disabled={!canConfirm || loading}
              onClick={handleConfirm}
              style={{ background: 'linear-gradient(135deg, #00CB96 0%, #00E5A8 100%)', color: '#fff', border: 'none' }}
            >
              <Check className="h-4 w-4 mr-1.5" />
              {loading ? 'Guardando...' : 'Registrar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
