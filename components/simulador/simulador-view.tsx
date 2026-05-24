'use client'

import { useState } from 'react'
import { MonthNav } from '@/components/dashboard/month-nav'

type CategorySpend = {
  id: string
  name: string
  icon: string
  color: string
  total: number
}

type Props = {
  categories: CategorySpend[]
  month: number
  year: number
}

const ARS = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

export function SimuladorView({ categories, month, year }: Props) {
  const [mode, setMode] = useState<'percent' | 'amount'>('percent')
  const [reductions, setReductions] = useState<Record<string, string>>({})

  function getProjected(cat: CategorySpend): number {
    const val = parseFloat(reductions[cat.id] ?? '0') || 0
    if (mode === 'percent') {
      return cat.total * (1 - Math.min(100, Math.max(0, val)) / 100)
    }
    return cat.total - Math.min(cat.total, Math.max(0, val))
  }

  const totalActual = categories.reduce((s, c) => s + c.total, 0)
  const totalAhorro = categories.reduce((s, c) => s + (c.total - getProjected(c)), 0)
  const totalNuevo  = totalActual - totalAhorro

  return (
    <div className="p-4 pb-8 max-w-2xl mx-auto space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Simulador</h1>
        <MonthNav month={month} year={year} basePath="/simulador" />
      </div>

      {/* Mode toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Reducir por:</span>
        <div className="flex rounded-lg overflow-hidden border border-border">
          {(['percent', 'amount'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setReductions({}) }}
              className="px-4 py-1.5 text-xs font-bold transition-colors"
              style={mode === m
                ? { background: 'linear-gradient(135deg, #7C4DFF 0%, #9C6DFF 100%)', color: '#fff' }
                : { color: 'hsl(var(--muted-foreground))' }
              }
            >
              {m === 'percent' ? '%' : '$'}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {categories.length === 0 && (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No hay gastos registrados en este período.
        </div>
      )}

      {/* Category rows */}
      <div className="space-y-2">
        {categories.map(cat => {
          const projected = getProjected(cat)
          const saving    = cat.total - projected
          const hasRedux  = saving > 0.5

          return (
            <div
              key={cat.id}
              className="rounded-xl border border-border p-4"
              style={{ background: 'hsl(var(--card))' }}
            >
              {/* Name + actual */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="h-9 w-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                    style={{ backgroundColor: cat.color + '20' }}
                  >
                    {cat.icon}
                  </div>
                  <span className="text-sm font-semibold text-foreground">{cat.name}</span>
                </div>
                <span className="text-sm font-bold text-foreground tabular-nums">
                  {ARS.format(cat.total)}
                </span>
              </div>

              {/* Input + projected */}
              <div className="flex items-center gap-3 pl-[2.875rem]">
                <div className="flex items-center gap-1.5 bg-muted rounded-lg px-3 py-1.5 flex-1 max-w-[160px]">
                  {mode === 'amount' && (
                    <span className="text-xs text-muted-foreground flex-shrink-0">−$</span>
                  )}
                  <input
                    type="number"
                    min={0}
                    max={mode === 'percent' ? 100 : cat.total}
                    value={reductions[cat.id] ?? ''}
                    onChange={e => setReductions(prev => ({ ...prev, [cat.id]: e.target.value }))}
                    placeholder="0"
                    className="w-full bg-transparent text-sm font-bold text-foreground outline-none min-w-0"
                  />
                  {mode === 'percent' && (
                    <span className="text-xs text-muted-foreground flex-shrink-0">%</span>
                  )}
                </div>

                <div className="flex-1 text-right">
                  <p
                    className="text-sm font-bold tabular-nums"
                    style={{ color: hasRedux ? '#00CB96' : 'hsl(var(--foreground))' }}
                  >
                    {ARS.format(projected)}
                  </p>
                  {hasRedux && (
                    <p className="text-[10px] text-muted-foreground">
                      ahorrás {ARS.format(saving)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary card */}
      {categories.length > 0 && (
        <div
          className="rounded-2xl border p-4 space-y-3 mt-2"
          style={{
            background: 'hsl(var(--card))',
            borderColor: totalAhorro > 0 ? '#00CB9630' : 'hsl(var(--border))',
          }}
        >
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Resumen</p>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Gasto actual</span>
            <span className="font-bold text-foreground tabular-nums">{ARS.format(totalActual)}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Ahorro proyectado</span>
            <span
              className="font-bold tabular-nums"
              style={{ color: totalAhorro > 0 ? '#00CB96' : 'hsl(var(--muted-foreground))' }}
            >
              {totalAhorro > 0 ? `−${ARS.format(totalAhorro)}` : ARS.format(0)}
            </span>
          </div>

          <div className="h-px bg-border" />

          <div className="flex justify-between items-baseline">
            <span className="text-sm font-semibold text-foreground">Nuevo total</span>
            <span
              className="text-xl font-bold tabular-nums"
              style={{ color: totalAhorro > 0 ? '#00CB96' : 'hsl(var(--foreground))' }}
            >
              {ARS.format(totalNuevo)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
