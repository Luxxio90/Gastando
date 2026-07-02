import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { todayLocalStr } from '@/lib/utils'

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { token, item_id, status, amount, description, category_id, responsible, due_day, account_id } = body

  if (!token || !item_id)
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })

  const supabase = createServiceClient()

  const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const owner = users.find(u => u.user_metadata?.sa_token === token)
  if (!owner) return NextResponse.json({ error: 'Token inválido' }, { status: 403 })

  // Verify the item belongs to the owner
  const { data: item } = await supabase
    .from('fixed_expense_items')
    .select('id, user_id, status, amount, account_id, category_id, description')
    .eq('id', item_id)
    .single()

  if (!item || item.user_id !== owner.id)
    return NextResponse.json({ error: 'Item no autorizado' }, { status: 403 })

  const newAmount = amount !== undefined ? parseFloat(amount) : item.amount
  const newStatus = status ?? item.status

  const { data: updated, error } = await supabase
    .from('fixed_expense_items')
    .update({
      status: newStatus,
      amount: newAmount,
      description: description?.trim() ?? item.description,
      category_id: category_id !== undefined ? (category_id || null) : item.category_id,
      responsible: responsible !== undefined ? (responsible || null) : undefined,
      due_day: due_day !== undefined ? (due_day ? parseInt(due_day) : null) : undefined,
    })
    .eq('id', item_id)
    .select('*, category:categories(id,name,icon,color)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If newly paid and has account_id, create a transaction
  const wasntPaid = item.status !== 'paid'
  const isNowPaid = newStatus === 'paid'
  const acctId = account_id || item.account_id

  if (wasntPaid && isNowPaid && acctId && newAmount > 0) {
    const desc = description?.trim() || item.description || (updated as any)?.category?.name || 'Gasto fijo'
    const today = todayLocalStr()
    await supabase.from('transactions').insert({
      user_id: owner.id,
      account_id: acctId,
      category_id: category_id ?? item.category_id ?? null,
      type: 'expense',
      amount: newAmount,
      description: desc,
      date: today,
      notes: null,
    })
  }

  return NextResponse.json({ item: updated })
}
