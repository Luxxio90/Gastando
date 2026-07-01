import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const { token, card_id, ...fields } = body

  if (!token || !card_id)
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })

  const supabase = createServiceClient()
  const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const owner = users.find(u => u.user_metadata?.sa_token === token)
  if (!owner) return NextResponse.json({ error: 'Token inválido' }, { status: 403 })

  const { data: card } = await supabase.from('budget_cards').select('user_id').eq('id', card_id).single()
  if (!card || card.user_id !== owner.id)
    return NextResponse.json({ error: 'Card no autorizada' }, { status: 403 })

  const { error } = await supabase.from('budget_cards').update(fields).eq('id', card_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
