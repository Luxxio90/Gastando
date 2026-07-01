import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { token, type, amount, description, date, account_id, category_id, notes, responsible_party_id } = body

  if (!token || !type || !amount || !date || !account_id)
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })

  const supabase = createServiceClient()

  const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const owner = users.find(u => u.user_metadata?.sa_token === token)
  if (!owner) return NextResponse.json({ error: 'Token inválido' }, { status: 403 })

  const account_ids: string[] = owner.user_metadata.sa_accounts ?? []
  if (!account_ids.includes(account_id))
    return NextResponse.json({ error: 'Cuenta no autorizada' }, { status: 403 })

  const { data, error } = await supabase.from('transactions').insert({
    user_id: owner.id,
    account_id,
    type,
    amount: parseFloat(amount),
    description: description?.trim() || null,
    date,
    category_id: category_id || null,
    notes: notes?.trim() || null,
    responsible_party_id: responsible_party_id || null,
  }).select('*, category:categories(id,name,icon,color,type)').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ transaction: data })
}
