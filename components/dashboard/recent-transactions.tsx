import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Transaction } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

export function RecentTransactions({ transactions }: { transactions: Transaction[] }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Transacciones recientes</CardTitle>
        <Link href="/transactions" className="text-xs text-primary hover:underline">Ver todas</Link>
      </CardHeader>
      <CardContent className="p-0">
        {transactions.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-8">No hay transacciones este mes</p>
        ) : (
          <div className="divide-y divide-border/50">
            {transactions.map(t => (
              <div key={t.id} className="flex items-center gap-3 px-6 py-3 hover:bg-muted/20 transition-colors">
                <div
                  className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: t.type === 'income' ? '#00CB9618' : '#FF4D6D18' }}
                >
                  {t.type === 'income'
                    ? <ArrowUpRight className="h-4 w-4" style={{ color: '#00CB96' }} />
                    : <ArrowDownLeft className="h-4 w-4" style={{ color: '#FF4D6D' }} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.description}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {formatDate(t.date)} · {t.account?.name}
                  </p>
                </div>
                <span
                  className="text-sm font-bold flex-shrink-0"
                  style={{ color: t.type === 'income' ? '#00CB96' : '#FF4D6D' }}
                >
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
