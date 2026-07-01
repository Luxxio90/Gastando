import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const cardMonthId = formData.get('cardMonthId') as string | null

  if (!file || !cardMonthId)
    return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })

  const service = createServiceClient()

  const { data: month } = await service
    .from('credit_card_months').select('user_id').eq('id', cardMonthId).single()
  if (!month || month.user_id !== user.id)
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${user.id}/${cardMonthId}.${ext}`

  const buffer = Buffer.from(await file.arrayBuffer())
  const { error } = await service.storage.from('card-images').upload(path, buffer, {
    contentType: file.type,
    upsert: true,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: { publicUrl } } = service.storage.from('card-images').getPublicUrl(path)
  const { error: updateError } = await service.from('credit_card_months').update({ image_url: publicUrl }).eq('id', cardMonthId)
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  return NextResponse.json({ publicUrl })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { cardMonthId, imageUrl } = await req.json()

  const service = createServiceClient()
  const { data: month } = await service
    .from('credit_card_months').select('user_id').eq('id', cardMonthId).single()
  if (!month || month.user_id !== user.id)
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const pathMatch = imageUrl?.match(/card-images\/(.+?)(\?|$)/)
  if (pathMatch) await service.storage.from('card-images').remove([decodeURIComponent(pathMatch[1])])

  await service.from('credit_card_months').update({ image_url: null }).eq('id', cardMonthId)
  return NextResponse.json({ ok: true })
}
