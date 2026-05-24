import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SimuladorView } from '@/components/simulador/simulador-view'

export default async function SimuladorPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const params = await searchParams
  const now    = new Date()
  const month  = parseInt(params.month ?? String(now.getMonth() + 1))
  const year   = parseInt(params.year  ?? String(now.getFullYear()))

  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const end   = month === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(month + 1).padStart(2, '0')}-01`

  const { data: rows } = await supabase
    .from('transactions')
    .select('amount, category:categories(id, name, icon, color)')
    .eq('user_id', user.id)
    .eq('type', 'expense')
    .is('transfer_group_id', null)
    .gte('date', start)
    .lt('date', end)

  type CatRaw = { id: string; name: string; icon: string; color: string }
  const byCategory = new Map<string, { id: string; name: string; icon: string; color: string; total: number }>()

  for (const row of rows ?? []) {
    const cat = row.category as CatRaw | null
    if (!cat) continue
    const existing = byCategory.get(cat.id)
    if (existing) {
      existing.total += row.amount
    } else {
      byCategory.set(cat.id, { ...cat, total: row.amount })
    }
  }

  const categories = Array.from(byCategory.values()).sort((a, b) => b.total - a.total)

  return (
    <div className="pb-24 md:pb-0">
      <SimuladorView categories={categories} month={month} year={year} />
    </div>
  )
}
