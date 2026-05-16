import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Transaction } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import Link from 'next/link'

interface Props {
  transactions: Transaction[]
}

export function RecentTransactions({ transactions }: Props) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Últimas transacciones</CardTitle>
        <Link href="/transactions" className="text-xs text-emerald-600 hover:underline">Ver todas</Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {transactions.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">No hay transacciones este mes</p>
        ) : (
          transactions.map(t => (
            <div key={t.id} className="flex items-center gap-3">
              <div className={`p-1.5 rounded-full ${t.type === 'income' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                {t.type === 'income'
                  ? <ArrowUpCircle className="h-4 w-4 text-emerald-600" />
                  : <ArrowDownCircle className="h-4 w-4 text-red-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{t.description}</p>
                <p className="text-xs text-gray-400">{formatDate(t.date)} · {t.category?.name}</p>
              </div>
              <span className={`text-sm font-semibold ${t.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
