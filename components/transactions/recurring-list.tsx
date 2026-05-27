'use client'

import { useState } from 'react'
import { RecurringTransaction } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Repeat, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'

interface Props {
  recurring: RecurringTransaction[]
}

export function RecurringList({ recurring }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [toggling, setToggling]           = useState<string | null>(null)
  const [localActive, setLocalActive]     = useState<Record<string, boolean>>({})
  const [pendingDelete, setPendingDelete] = useState<RecurringTransaction | null>(null)
  const [deleting, setDeleting]           = useState(false)

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

  return (
    <>
      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Recurrentes</h2>
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {recurring.map(rt => {
                const color = rt.type === 'income' ? '#00CB96' : '#FF4D6D'
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
