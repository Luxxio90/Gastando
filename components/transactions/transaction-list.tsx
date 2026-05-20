'use client'

import { useState } from 'react'
import { Transaction, Account, Category } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ArrowDownCircle, ArrowUpCircle, Plus, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { TransactionDialog } from './transaction-dialog'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Props {
  transactions: Transaction[]
  accounts: Account[]
  categories: Category[]
  userId: string
  initialFilter?: 'all' | 'income' | 'expense'
}

export function TransactionList({ transactions, accounts, categories, userId, initialFilter = 'all' }: Props) {
  const [dialogOpen, setDialogOpen]   = useState(false)
  const [editing, setEditing]         = useState<Transaction | null>(null)
  const [filter, setFilter]           = useState<'all' | 'income' | 'expense'>(initialFilter)
  const [deleting, setDeleting]       = useState<string | null>(null)
  const router  = useRouter()
  const supabase = createClient()

  const filtered = filter === 'all' ? transactions : transactions.filter(t => t.type === filter)

  function openCreate() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(t: Transaction) {
    setEditing(t)
    setTimeout(() => setDialogOpen(true), 50)
  }

  async function handleDelete(t: Transaction) {
    setDeleting(t.id)
    // Revert balance effect
    const { data: acc } = await supabase.from('accounts').select('balance').eq('id', t.account_id).single()
    if (acc) {
      const revert = t.type === 'income' ? -t.amount : t.amount
      await supabase.from('accounts').update({ balance: acc.balance + revert }).eq('id', t.account_id)
    }
    const { error } = await supabase.from('transactions').delete().eq('id', t.id)
    if (error) {
      toast.error('Error al eliminar')
    } else {
      toast.success('Transacción eliminada')
      router.refresh()
    }
    setDeleting(null)
  }

  const FILTERS: { key: 'all' | 'income' | 'expense'; label: string }[] = [
    { key: 'all',     label: 'Todos' },
    { key: 'income',  label: 'Ingresos' },
    { key: 'expense', label: 'Gastos' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Transacciones</h1>
        <Button
          onClick={openCreate}
          size="sm"
          style={{ background: 'linear-gradient(135deg, #7C4DFF 0%, #9C6DFF 100%)', color: '#fff', border: 'none' }}
        >
          <Plus className="h-4 w-4 mr-1" /> Nueva
        </Button>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
            style={filter === key
              ? { background: '#7C4DFF20', borderColor: '#7C4DFF60', color: '#7C4DFF' }
              : { background: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }
            }
          >
            {label}
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center text-muted-foreground py-12 text-sm">No hay transacciones</div>
          ) : (
            <div className="divide-y divide-border/50">
              {filtered.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                  {/* Icon */}
                  <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    t.type === 'income' ? 'bg-emerald-500/10' : 'bg-red-500/10'
                  }`}>
                    {t.type === 'income'
                      ? <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
                      : <ArrowDownCircle className="h-4 w-4 text-red-500" />}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{t.description}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {formatDate(t.date)}
                      {t.account?.name  ? ` · ${t.account.name}`   : ''}
                      {t.category?.name ? ` · ${t.category.name}`  : ''}
                    </p>
                  </div>

                  {/* Amount */}
                  <span className={`text-sm font-bold tabular-nums flex-shrink-0 ${
                    t.type === 'income' ? 'text-emerald-500' : 'text-red-500'
                  }`}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </span>

                  {/* 3-dots menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-muted/60 transition-colors flex-shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(t)}>
                        <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-500"
                        disabled={deleting === t.id}
                        onClick={() => handleDelete(t)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        {deleting === t.id ? 'Eliminando...' : 'Eliminar'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TransactionDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null) }}
        accounts={accounts}
        categories={categories}
        userId={userId}
        editingTransaction={editing}
      />
    </div>
  )
}
