'use client'

import { useState } from 'react'
import { ChevronDown, MoreVertical } from 'lucide-react'
import { Category, Responsible } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Props {
  categories: Category[]
  variableExpenseByCat: Record<string, number>
  totalIncome: number
  responsibles: Responsible[]
  selectedResponsibleId: string | null
  onSelectResponsible: (id: string | null) => void
}

export function VariableExpensesCard({ categories, variableExpenseByCat, totalIncome, responsibles, selectedResponsibleId, onSelectResponsible }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [draft, setDraft] = useState<string | null>(null)

  const variableCats = categories.filter(c =>
    c.type === 'expense' && c.expense_type?.name !== 'Gasto fijo'
  )

  const rows = variableCats
    .map(c => ({ cat: c, amount: variableExpenseByCat[c.id] ?? 0 }))
    .filter(r => r.amount > 0)
    .sort((a, b) => b.amount - a.amount)

  const total = rows.reduce((s, r) => s + r.amount, 0)

  if (total === 0 && !selectedResponsibleId) return null

  const pctOfIncome = totalIncome > 0 ? (total / totalIncome) * 100 : null
  const VARIABLE_COLOR = '#F59E0B'

  const selectedResponsible = responsibles.find(r => r.id === selectedResponsibleId)

  function openEdit() {
    setDraft(selectedResponsibleId)
    setEditOpen(true)
  }

  function applyEdit() {
    onSelectResponsible(draft)
    setEditOpen(false)
  }

  return (
    <>
      <div className="space-y-4 max-w-2xl mx-auto mt-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Gastos variables</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selectedResponsible
                ? `Filtrando por ${selectedResponsible.name} · sin transferencias`
                : 'Gastos del mes sin contar transferencias'
              }
            </p>
          </div>
          {selectedResponsible && (
            <span
              className="text-[10px] font-bold px-2 py-1 rounded-full"
              style={{ backgroundColor: selectedResponsible.color + '20', color: selectedResponsible.color }}
            >
              {selectedResponsible.name}
            </span>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          {/* Header */}
          <div
            className="grid grid-cols-[1fr_56px_120px_32px] items-center px-4 py-2.5 bg-muted/40 border-b border-border transition-colors hover:bg-muted/60"
            style={{ borderBottom: collapsed ? 'none' : undefined }}
          >
            <div
              className="flex items-center gap-1.5 cursor-pointer select-none"
              onClick={() => setCollapsed(c => !c)}
            >
              <ChevronDown
                className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 flex-shrink-0"
                style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
              />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Categoría</span>
            </div>
            <span
              className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-center cursor-pointer select-none"
              onClick={() => setCollapsed(c => !c)}
            >%</span>
            <span
              className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-right cursor-pointer select-none"
              onClick={() => setCollapsed(c => !c)}
            >Monto</span>
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger className="p-1 rounded text-muted-foreground/40 hover:text-foreground hover:bg-muted/60 transition-colors">
                  <MoreVertical className="h-3.5 w-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={openEdit}>Editar</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {!collapsed && rows.length === 0 && (
            <div className="px-4 py-6 text-center text-xs text-muted-foreground">
              Sin gastos variables{selectedResponsible ? ` para ${selectedResponsible.name}` : ''} este mes
            </div>
          )}

          {!collapsed && rows.map(({ cat, amount }) => {
            const pct = total > 0 ? ((amount / total) * 100).toFixed(1) : null
            const barWidth = total > 0 ? (amount / total) * 100 : 0
            return (
              <div key={cat.id} className="border-b border-border last:border-b-0">
                <div className="grid grid-cols-[1fr_56px_120px_32px] items-center px-4 py-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base leading-none flex-shrink-0">{cat.icon}</span>
                    <p className="text-sm font-medium text-foreground truncate">{cat.name}</p>
                  </div>
                  <div className="flex justify-center">
                    {pct !== null ? (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ color: VARIABLE_COLOR, backgroundColor: VARIABLE_COLOR + '18' }}
                      >
                        {pct}%
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground/40">—</span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {formatCurrency(amount)}
                    </span>
                  </div>
                  <span />
                </div>
                {barWidth > 0 && (
                  <div className="h-0.5 mx-4 bg-muted/40 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${barWidth}%`, backgroundColor: VARIABLE_COLOR + 'aa' }} />
                  </div>
                )}
              </div>
            )
          })}

          {/* Total */}
          {!collapsed && (
            <div
              className="grid grid-cols-[1fr_56px_120px_32px] items-center px-4 py-2.5"
              style={{ backgroundColor: VARIABLE_COLOR + '10' }}
            >
              <span className="text-xs font-bold" style={{ color: VARIABLE_COLOR }}>Total variables</span>
              <span className="text-center text-[10px] font-bold" style={{ color: VARIABLE_COLOR }}>
                {pctOfIncome !== null ? `${pctOfIncome.toFixed(1)}%` : '—'}
              </span>
              <span className="text-right text-sm font-bold tabular-nums" style={{ color: VARIABLE_COLOR }}>
                {formatCurrency(total)}
              </span>
              <span />
            </div>
          )}
        </div>
      </div>

      {/* Dialog selector de encargado */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-xs p-0 gap-0 border-border">
          <div
            className="px-5 pt-5 pb-4 border-b border-border"
            style={{ background: `linear-gradient(135deg, ${VARIABLE_COLOR}18 0%, transparent 100%)` }}
          >
            <DialogTitle className="text-base font-semibold">Filtrar por encargado</DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Seleccioná un encargado o mostrá todos</p>
          </div>

          <div className="p-4 space-y-2">
            {/* Opción "Todos" */}
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm transition-all text-left"
              style={draft === null
                ? { backgroundColor: VARIABLE_COLOR + '15', borderColor: VARIABLE_COLOR + '50', color: 'hsl(var(--foreground))' }
                : { borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }
              }
            >
              <div className="h-2.5 w-2.5 rounded-full flex-shrink-0 bg-muted-foreground/30" />
              <span className="font-medium">Todos</span>
            </button>

            {responsibles.map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => setDraft(r.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm transition-all text-left"
                style={draft === r.id
                  ? { backgroundColor: r.color + '15', borderColor: r.color + '50', color: 'hsl(var(--foreground))' }
                  : { borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }
                }
              >
                <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
                <span className="font-medium">{r.name}</span>
              </button>
            ))}

            {responsibles.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                No hay encargados configurados. Creá uno en Ajustes.
              </p>
            )}
          </div>

          <div className="flex gap-2 px-4 pb-4">
            <Button variant="outline" className="flex-1" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button
              className="flex-1 font-semibold"
              style={{ background: `linear-gradient(135deg, ${VARIABLE_COLOR} 0%, #FBBF24 100%)`, color: '#000', border: 'none' }}
              onClick={applyEdit}
            >
              Aplicar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
