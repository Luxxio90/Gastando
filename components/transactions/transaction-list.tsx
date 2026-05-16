'use client'

import { useState } from 'react'
import { Transaction, Account, Category } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowDownCircle, ArrowUpCircle, Plus, Trash2 } from 'lucide-react'
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
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>(initialFilter)
  const router = useRouter()
  const supabase = createClient()

  const filtered = filter === 'all' ? transactions : transactions.filter(t => t.type === filter)

  async function handleDelete(id: string) {
    const { error } = await supabase.from('transactions').delete().eq('id', id)
    if (error) {
      toast.error('Error al eliminar la transacción')
    } else {
      toast.success('Transacción eliminada')
      router.refresh()
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Transacciones</h1>
        <Button onClick={() => setOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="h-4 w-4 mr-2" /> Nueva transacción
        </Button>
      </div>

      <div className="flex gap-2">
        {(['all', 'income', 'expense'] as const).map(f => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
            className={filter === f ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
          >
            {f === 'all' ? 'Todos' : f === 'income' ? 'Ingresos' : 'Gastos'}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center text-gray-400 py-12">No hay transacciones</div>
          ) : (
            <div className="divide-y">
              {filtered.map(t => (
                <div key={t.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50">
                  <div className={`p-2 rounded-full ${t.type === 'income' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                    {t.type === 'income'
                      ? <ArrowUpCircle className="h-4 w-4 text-emerald-600" />
                      : <ArrowDownCircle className="h-4 w-4 text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.description}</p>
                    <p className="text-xs text-gray-400">{formatDate(t.date)} · {t.account?.name} · {t.category?.name}</p>
                  </div>
                  <span className={`text-sm font-bold ${t.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-gray-400 hover:text-red-500"
                    onClick={() => handleDelete(t.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TransactionDialog
        open={open}
        onClose={() => setOpen(false)}
        accounts={accounts}
        categories={categories}
        userId={userId}
      />
    </div>
  )
}
