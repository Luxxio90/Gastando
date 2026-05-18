'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ArrowDownCircle, ArrowUpCircle, Wallet, TrendingUp, Settings2 } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Account, Investment } from '@/types'

type CardKey = 'balance' | 'income' | 'expenses'
type AccountConfig = Record<CardKey, string[] | null>

const STORAGE_KEY = (userId: string) => `gastando_cards_${userId}`

function loadConfig(userId: string): AccountConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(userId))
    if (raw) {
      const p = JSON.parse(raw)
      return { balance: p.balance ?? null, income: p.income ?? null, expenses: p.expenses ?? null }
    }
  } catch {}
  return { balance: null, income: null, expenses: null }
}

function saveKey(userId: string, key: CardKey, val: string[] | null) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(userId))
    const current = raw ? JSON.parse(raw) : {}
    localStorage.setItem(STORAGE_KEY(userId), JSON.stringify({ ...current, [key]: val }))
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
}

export function DashboardCards({ accounts, transactions, investments, userId }: Props) {
  const [config, setConfig] = useState<AccountConfig>({ balance: null, income: null, expenses: null })
  const [configuring, setConfiguring] = useState<CardKey | null>(null)
  const [draft, setDraft] = useState<string[]>([])

  useEffect(() => {
    setConfig(loadConfig(userId))
  }, [userId])

  function ids(key: CardKey): Set<string> | null {
    return config[key] === null ? null : new Set(config[key]!)
  }

  function accountsFor(key: CardKey) {
    const set = ids(key)
    return set === null ? accounts : accounts.filter(a => set.has(a.id))
  }

  const totalBalance = accountsFor('balance').reduce((s, a) => s + a.balance, 0)
  const incomeSet = ids('income')
  const expenseSet = ids('expenses')
  const monthIncome = transactions
    .filter(t => t.type === 'income' && (incomeSet === null || incomeSet.has(t.account_id)))
    .reduce((s, t) => s + t.amount, 0)
  const monthExpenses = transactions
    .filter(t => t.type === 'expense' && (expenseSet === null || expenseSet.has(t.account_id)))
    .reduce((s, t) => s + t.amount, 0)
  const totalInvested = investments.reduce((s, i) => s + i.current_value, 0)

  function subLabel(key: CardKey) {
    const cfg = config[key]
    return cfg === null ? `${accounts.length} cuenta(s)` : `${cfg.length} de ${accounts.length} cuenta(s)`
  }

  function openConfig(key: CardKey) {
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
    saveKey(userId, configuring, newVal)
    setConfiguring(null)
  }

  const GearBtn = ({ k }: { k: CardKey }) => (
    <button onClick={() => openConfig(k)}
      className="p-1 rounded hover:bg-gray-100 text-gray-300 hover:text-gray-600 transition-colors flex-shrink-0"
      title="Configurar cuentas">
      <Settings2 className="h-3.5 w-3.5" />
    </button>
  )

  return (
    <>
      <div className="space-y-3">
        {/* Fila 1 — Saldo total (ancho completo) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Saldo total</CardTitle>
            <div className="flex items-center gap-1">
              <GearBtn k="balance" />
              <Wallet className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight">{formatCurrency(totalBalance)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{subLabel('balance')}</p>
          </CardContent>
        </Card>

        {/* Fila 2 — Ingresos + Gastos en 2 columnas */}
        <div className="grid grid-cols-2 gap-3">
          {/* Ingresos */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-1 px-4 pt-4">
              <CardTitle className="text-xs font-medium text-gray-500 leading-tight">Ingresos del mes</CardTitle>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <GearBtn k="income" />
                <ArrowUpCircle className="h-3.5 w-3.5 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-xl font-bold text-emerald-600 leading-tight truncate">{formatCurrency(monthIncome)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 truncate">{subLabel('income')}</p>
            </CardContent>
          </Card>

          {/* Gastos */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-1 px-4 pt-4">
              <CardTitle className="text-xs font-medium text-gray-500 leading-tight">Gastos del mes</CardTitle>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <GearBtn k="expenses" />
                <ArrowDownCircle className="h-3.5 w-3.5 text-red-500" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-xl font-bold text-red-500 leading-tight truncate">{formatCurrency(monthExpenses)}</p>
              <p className="text-[10px] text-gray-400 mt-0.5 truncate">{subLabel('expenses')}</p>
            </CardContent>
          </Card>
        </div>

        {/* Fila 3 — Inversiones (ancho completo) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Inversiones</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600 tracking-tight">{formatCurrency(totalInvested)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{investments.length} activo(s)</p>
          </CardContent>
        </Card>
      </div>

      {/* Selector de cuentas */}
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
                    selected ? 'border-emerald-500 bg-emerald-50 text-emerald-900' : 'border-gray-200 text-gray-400 bg-gray-50'
                  )}>
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
