'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ArrowDownLeft, ArrowUpRight, Wallet, TrendingUp, Settings2, Eye, EyeOff } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Account, Investment } from '@/types'

type CardKey = 'balance' | 'income' | 'expenses'
type AccountConfig = Record<CardKey, string[] | null>

const STORAGE_KEY = (userId: string) => `gastando_cards_${userId}`
const HIDE_KEY = 'gastando_hide_balances'

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
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    setConfig(loadConfig(userId))
    try { setHidden(localStorage.getItem(HIDE_KEY) === 'true') } catch {}
  }, [userId])

  function toggleHidden() {
    const next = !hidden
    setHidden(next)
    try { localStorage.setItem(HIDE_KEY, String(next)) } catch {}
  }

  const mask = '••••••'

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

  const expensesPct = monthIncome > 0
    ? `${Math.round((monthExpenses / monthIncome) * 100)}% del total`
    : subLabel('expenses')

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
      className="p-1 rounded hover:bg-muted text-muted-foreground/30 hover:text-muted-foreground transition-colors flex-shrink-0"
      title="Configurar cuentas">
      <Settings2 className="h-4 w-4" />
    </button>
  )

  return (
    <>
      <div className="space-y-3">
        {/* Fila 1 — Saldo total */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo total</CardTitle>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleHidden}
                className="p-1 rounded hover:bg-muted text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                title={hidden ? 'Mostrar saldos' : 'Ocultar saldos'}
              >
                {hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <GearBtn k="balance" />
              <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#7C4DFF20' }}>
                <Wallet className="h-4 w-4" style={{ color: '#7C4DFF' }} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight">{hidden ? mask : formatCurrency(totalBalance)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{subLabel('balance')}</p>
          </CardContent>
        </Card>

        {/* Fila 2 — Ingresos + Gastos en 2 columnas */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-1 px-4 pt-4">
              <CardTitle className="text-xs font-medium text-muted-foreground leading-tight">Ingresos del mes</CardTitle>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <GearBtn k="income" />
                <div className="h-6 w-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#00CB9620' }}>
                  <ArrowUpRight className="h-3 w-3" style={{ color: '#00CB96' }} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-xl font-bold leading-tight truncate" style={{ color: '#00CB96' }}>{hidden ? mask : formatCurrency(monthIncome)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{subLabel('income')}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-1 px-4 pt-4">
              <CardTitle className="text-xs font-medium text-muted-foreground leading-tight">Gastos del mes</CardTitle>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <GearBtn k="expenses" />
                <div className="h-6 w-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FF4D6D20' }}>
                  <ArrowDownLeft className="h-3 w-3" style={{ color: '#FF4D6D' }} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-xl font-bold leading-tight truncate" style={{ color: '#FF4D6D' }}>{hidden ? mask : formatCurrency(monthExpenses)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{expensesPct}</p>
            </CardContent>
          </Card>
        </div>

        {/* Fila 3 — Inversiones */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Inversiones</CardTitle>
            <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#3BB2F620' }}>
              <TrendingUp className="h-3.5 w-3.5" style={{ color: '#3BB2F6' }} />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tracking-tight" style={{ color: '#3BB2F6' }}>{hidden ? mask : formatCurrency(totalInvested)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{investments.length} activo(s)</p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={configuring !== null} onOpenChange={() => setConfiguring(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Configurar — {configuring ? CARD_TITLES[configuring] : ''}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2">Seleccioná qué cuentas incluir</p>
          <div className="space-y-1.5">
            {accounts.map(a => {
              const selected = draft.includes(a.id)
              return (
                <button key={a.id} type="button" onClick={() => toggleAccount(a.id)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-colors',
                    selected ? 'border-primary/50 bg-primary/10 text-primary' : 'border-border text-muted-foreground bg-muted/30'
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
            <Button className="flex-1" onClick={applyConfig} disabled={draft.length === 0}>
              Guardar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
