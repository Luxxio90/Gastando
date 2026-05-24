'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, Plus, CreditCard, Trash2, Pencil, MoreVertical, X, Calendar, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils'
import type { CreditCard as CC, CreditCardMonth, CreditCardItem, CreditCardNetwork, CreditCardStatus, Account } from '@/types'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const NETWORK_GRADIENTS: Record<CreditCardNetwork, string> = {
  visa:       'linear-gradient(135deg, #1a237e 0%, #1565C0 60%, #1976D2 100%)',
  mastercard: 'linear-gradient(135deg, #121212 0%, #1e1e1e 50%, #2a2a2a 100%)',
  amex:       'linear-gradient(135deg, #003087 0%, #0066CC 100%)',
  nacion:     'linear-gradient(135deg, #0c4a8a 0%, #0e6eb8 100%)',
  provincia:  'linear-gradient(135deg, #2d1b69 0%, #4c1d95 100%)',
  modo:       'linear-gradient(135deg, #4c1d95 0%, #6d28d9 100%)',
  cabal:      'linear-gradient(135deg, #064e3b 0%, #065f46 100%)',
  naranja:    'linear-gradient(135deg, #9a3412 0%, #c2410c 100%)',
  other:      'linear-gradient(135deg, #1f2937 0%, #374151 100%)',
}

const NETWORKS: { value: CreditCardNetwork; label: string }[] = [
  { value: 'visa',       label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'amex',       label: 'American Express' },
  { value: 'nacion',     label: 'Banco Nación' },
  { value: 'provincia',  label: 'Banco Provincia' },
  { value: 'modo',       label: 'MODO' },
  { value: 'cabal',      label: 'Cabal' },
  { value: 'naranja',    label: 'Naranja' },
  { value: 'other',      label: 'Otra' },
]

function NetworkLogo({ network }: { network: CreditCardNetwork }) {
  switch (network) {
    case 'visa':
      return <span className="text-white font-black italic text-2xl tracking-widest" style={{ fontFamily: 'serif' }}>VISA</span>
    case 'mastercard':
      return (
        <div className="flex items-center -space-x-2">
          <div className="h-7 w-7 rounded-full bg-red-500" style={{ opacity: 0.9 }} />
          <div className="h-7 w-7 rounded-full bg-amber-400" style={{ opacity: 0.9 }} />
        </div>
      )
    case 'amex':
      return (
        <span className="text-white text-[9px] font-bold text-right leading-tight tracking-wide">
          AMERICAN<br />EXPRESS
        </span>
      )
    case 'nacion':
      return <span className="text-white font-bold text-sm tracking-wider">BNA</span>
    case 'provincia':
      return <span className="text-white font-bold text-sm tracking-wider">BPV</span>
    case 'modo':
      return <span className="text-white font-bold text-sm tracking-wider">MODO</span>
    case 'cabal':
      return <span className="text-white font-bold text-sm tracking-wider">CABAL</span>
    case 'naranja':
      return <span className="text-white font-bold text-sm tracking-wider">NARANJA</span>
    default:
      return <span className="text-white font-bold text-sm tracking-wider">TC</span>
  }
}

interface Props {
  cards: CC[]
  months: CreditCardMonth[]
  items: CreditCardItem[]
  accounts: Account[]
  userId: string
  month: number
  year: number
}

type CardForm = { name: string; network: CreditCardNetwork; account_id: string }
type ItemForm = { description: string; installment_current: string; installment_total: string; amount: string }
type PayForm = { account_id: string; amount: string }

const emptyCardForm: CardForm = { name: '', network: 'visa', account_id: '' }
const emptyItemForm: ItemForm = { description: '', installment_current: '', installment_total: '', amount: '' }

export function CreditCardsView({ cards: initialCards, months: initialMonths, items: initialItems, accounts, userId, month, year }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [cards, setCards] = useState(initialCards)
  const [months, setMonths] = useState(initialMonths)
  const [items, setItems] = useState(initialItems)
  const [summaryOpen, setSummaryOpen] = useState(true)

  const [cardDialog, setCardDialog] = useState(false)
  const [editingCard, setEditingCard] = useState<CC | null>(null)
  const [cardForm, setCardForm] = useState<CardForm>(emptyCardForm)
  const [cardLoading, setCardLoading] = useState(false)

  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const [itemDialog, setItemDialog] = useState(false)
  const [editingItem, setEditingItem] = useState<CreditCardItem | null>(null)
  const [itemForm, setItemForm] = useState<ItemForm>(emptyItemForm)
  const [itemLoading, setItemLoading] = useState(false)

  const [detailDialog, setDetailDialog] = useState(false)
  const [payDialog, setPayDialog] = useState(false)
  const [payForm, setPayForm] = useState<PayForm>({ account_id: '', amount: '' })
  const [payLoading, setPayLoading] = useState(false)

  function navigate(m: number, y: number) { router.push(`/tarjetas?month=${m}&year=${y}`) }
  function prev() { navigate(month === 1 ? 12 : month - 1, month === 1 ? year - 1 : year) }
  function next() { navigate(month === 12 ? 1 : month + 1, month === 12 ? year + 1 : year) }

  function getCardMonth(cardId: string) { return months.find(m => m.card_id === cardId) ?? null }
  function getCardItems(cardMonthId: string) { return items.filter(i => i.card_month_id === cardMonthId) }
  function cardTotal(cardId: string) {
    const cm = getCardMonth(cardId)
    if (!cm) return 0
    return getCardItems(cm.id).reduce((s, i) => s + i.amount, 0)
  }

  const selectedCard = cards.find(c => c.id === selectedCardId) ?? null
  const selectedMonth = selectedCardId ? getCardMonth(selectedCardId) : null
  const selectedItems = selectedMonth ? getCardItems(selectedMonth.id) : []
  const selectedTotal = selectedItems.reduce((s, i) => s + i.amount, 0)

  const totalPending = cards.filter(c => getCardMonth(c.id)?.status !== 'paid').reduce((s, c) => s + cardTotal(c.id), 0)
  const totalPaid = cards.filter(c => getCardMonth(c.id)?.status === 'paid').reduce((s, c) => s + cardTotal(c.id), 0)
  const totalAll = totalPending + totalPaid

  // ── Card CRUD ──────────────────────────────────────────────────
  function openCreateCard() { setEditingCard(null); setCardForm(emptyCardForm); setCardDialog(true) }
  function openEditCard(c: CC) { setEditingCard(c); setCardForm({ name: c.name, network: c.network, account_id: c.account_id ?? '' }); setCardDialog(true) }

  async function handleSaveCard(e: React.FormEvent) {
    e.preventDefault()
    setCardLoading(true)
    const cardPayload = { name: cardForm.name, network: cardForm.network, account_id: cardForm.account_id || null }
    if (editingCard) {
      const { error } = await supabase.from('credit_cards').update(cardPayload).eq('id', editingCard.id)
      if (error) { toast.error('Error al guardar'); setCardLoading(false); return }
      setCards(prev => prev.map(c => c.id === editingCard.id ? { ...c, ...cardPayload } : c))
      toast.success('Tarjeta actualizada')
    } else {
      const { data, error } = await supabase.from('credit_cards').insert({ user_id: userId, ...cardPayload }).select().single()
      if (error || !data) { toast.error('Error al crear'); setCardLoading(false); return }
      setCards(prev => [...prev, data as CC])
      const { data: cm } = await supabase.from('credit_card_months').insert({ card_id: data.id, user_id: userId, month, year }).select().single()
      if (cm) setMonths(prev => [...prev, cm as CreditCardMonth])
      toast.success('Tarjeta creada')
    }
    setCardDialog(false); setCardLoading(false)
  }

  async function handleDeleteCard(id: string) {
    const { error } = await supabase.from('credit_cards').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar'); return }
    setCards(prev => prev.filter(c => c.id !== id))
    setMonths(prev => prev.filter(m => m.card_id !== id))
    if (selectedCardId === id) setSelectedCardId(null)
    toast.success('Tarjeta eliminada')
  }

  // ── Status toggle ──────────────────────────────────────────────
  async function toggleStatus(cardMonthId: string, current: CreditCardStatus, cardId?: string) {
    const next = current === 'pending' ? 'paid' : 'pending'

    if (next === 'paid' && cardId) {
      const card = cards.find(c => c.id === cardId)
      if (card?.account_id) {
        const total = cardTotal(cardId)
        const account = accounts.find(a => a.id === card.account_id)
        if (account && total > 0) {
          let catId: string | null = null
          const { data: cats } = await supabase.from('categories').select('id').eq('name', 'Tarjeta de crédito').eq('type', 'expense').or(`user_id.eq.${userId},is_default.eq.true`).limit(1)
          if (cats && cats.length > 0) {
            catId = cats[0].id
          } else {
            const { data: newCat } = await supabase.from('categories').insert({ user_id: userId, name: 'Tarjeta de crédito', icon: '💳', color: '#6366f1', type: 'expense', is_default: false }).select('id').single()
            catId = newCat?.id ?? null
          }
          if (catId) {
            const { data: tx } = await supabase.from('transactions').insert({
              user_id: userId, account_id: card.account_id, category_id: catId,
              type: 'expense', amount: total,
              description: `Pago tarjeta: ${card.name}`,
              date: new Date().toISOString().split('T')[0], notes: null,
            }).select('id').single()
            await Promise.all([
              supabase.from('accounts').update({ balance: account.balance - total }).eq('id', card.account_id),
              supabase.from('credit_card_months').update({
                status: 'paid', paid_at: new Date().toISOString(),
                account_id: card.account_id, paid_amount: total,
                transaction_id: tx?.id ?? null,
              }).eq('id', cardMonthId),
            ])
            setMonths(prev => prev.map(m => m.id === cardMonthId ? { ...m, status: 'paid' as CreditCardStatus, paid_amount: total, account_id: card.account_id, transaction_id: tx?.id ?? null } : m))
            toast.success(`Pago de ${formatCurrency(total)} debitado de ${account.name}`)
            return
          }
        }
      }
    }

    if (next === 'pending') {
      const cm = months.find(m => m.id === cardMonthId)
      if (cm?.transaction_id && cm.account_id && cm.paid_amount) {
        const account = accounts.find(a => a.id === cm.account_id)
        await Promise.all([
          supabase.from('transactions').delete().eq('id', cm.transaction_id),
          account ? supabase.from('accounts').update({ balance: account.balance + cm.paid_amount }).eq('id', cm.account_id) : Promise.resolve(),
          supabase.from('credit_card_months').update({
            status: 'pending', paid_at: null, account_id: null, paid_amount: null, transaction_id: null,
          }).eq('id', cardMonthId),
        ])
        setMonths(prev => prev.map(m => m.id === cardMonthId ? { ...m, status: 'pending' as CreditCardStatus, paid_at: null, account_id: null, paid_amount: null, transaction_id: null } : m))
        toast.success('Pago revertido y saldo restaurado')
        return
      }
    }

    const { error } = await supabase.from('credit_card_months').update({ status: next }).eq('id', cardMonthId)
    if (error) { toast.error('Error al actualizar estado'); return }
    setMonths(prev => prev.map(m => m.id === cardMonthId ? { ...m, status: next } : m))
  }

  async function updateDueDate(cardMonthId: string, date: string) {
    const { error } = await supabase.from('credit_card_months').update({ due_date: date || null }).eq('id', cardMonthId)
    if (!error) setMonths(prev => prev.map(m => m.id === cardMonthId ? { ...m, due_date: date || null } : m))
  }

  // ── Item CRUD ──────────────────────────────────────────────────
  function openCreateItem() { setEditingItem(null); setItemForm(emptyItemForm); setItemDialog(true) }
  function openEditItem(item: CreditCardItem) {
    setEditingItem(item)
    setItemForm({
      description: item.description,
      installment_current: item.installment_current?.toString() ?? '',
      installment_total: item.installment_total?.toString() ?? '',
      amount: item.amount.toString(),
    })
    setItemDialog(true)
  }

  async function handleSaveItem(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedMonth) return
    setItemLoading(true)
    const payload = {
      card_month_id: selectedMonth.id,
      user_id: userId,
      description: itemForm.description.trim(),
      installment_current: itemForm.installment_current ? parseInt(itemForm.installment_current) : null,
      installment_total: itemForm.installment_total ? parseInt(itemForm.installment_total) : null,
      amount: parseFloat(itemForm.amount) || 0,
    }
    if (editingItem) {
      const { data, error } = await supabase.from('credit_card_items').update(payload).eq('id', editingItem.id).select().single()
      if (error) { toast.error('Error al guardar'); setItemLoading(false); return }
      setItems(prev => prev.map(i => i.id === editingItem.id ? data as CreditCardItem : i))
      toast.success('Ítem actualizado')
    } else {
      const { data, error } = await supabase.from('credit_card_items').insert(payload).select().single()
      if (error) { toast.error('Error al agregar'); setItemLoading(false); return }
      setItems(prev => [...prev, data as CreditCardItem])
      toast.success('Ítem agregado')
    }
    setItemDialog(false); setItemLoading(false)
  }

  async function handleDeleteItem(id: string) {
    const { error } = await supabase.from('credit_card_items').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar'); return }
    setItems(prev => prev.filter(i => i.id !== id))
    toast.success('Ítem eliminado')
  }

  // ── Payment ────────────────────────────────────────────────────
  function openPayDialog() {
    const linkedId = selectedCard?.account_id ?? accounts[0]?.id ?? ''
    setPayForm({ account_id: linkedId, amount: selectedTotal.toString() })
    setPayDialog(true)
  }

  async function handlePay(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedMonth || !payForm.account_id) return
    setPayLoading(true)
    const amount = parseFloat(payForm.amount) || 0

    let catId: string | null = null
    const { data: cats } = await supabase.from('categories').select('id').eq('name', 'Tarjeta de crédito').eq('type', 'expense').or(`user_id.eq.${userId},is_default.eq.true`).limit(1)
    if (cats && cats.length > 0) {
      catId = cats[0].id
    } else {
      const { data: newCat } = await supabase.from('categories').insert({ user_id: userId, name: 'Tarjeta de crédito', icon: '💳', color: '#6366f1', type: 'expense', is_default: false }).select('id').single()
      catId = newCat?.id ?? null
    }
    if (!catId) { toast.error('Error al preparar categoría'); setPayLoading(false); return }

    const { data: acc } = await supabase.from('accounts').select('balance').eq('id', payForm.account_id).single()
    if (!acc) { toast.error('Cuenta no encontrada'); setPayLoading(false); return }

    const { data: txData, error: txError } = await supabase.from('transactions').insert({
      user_id: userId, account_id: payForm.account_id, category_id: catId,
      type: 'expense', amount, description: `Pago tarjeta: ${selectedCard?.name}`,
      date: new Date().toISOString().split('T')[0], notes: null,
    }).select('id').single()
    const r2 = await supabase.from('accounts').update({ balance: acc.balance - amount }).eq('id', payForm.account_id)
    if (txError || r2.error) { toast.error('Error al registrar el pago'); setPayLoading(false); return }

    await supabase.from('credit_card_months').update({
      status: 'paid', paid_at: new Date().toISOString(),
      account_id: payForm.account_id, paid_amount: amount,
      transaction_id: txData?.id ?? null,
    }).eq('id', selectedMonth.id)

    setMonths(prev => prev.map(m => m.id === selectedMonth.id ? { ...m, status: 'paid' as CreditCardStatus, paid_amount: amount, account_id: payForm.account_id, transaction_id: txData?.id ?? null } : m))
    toast.success(`Pago de ${formatCurrency(amount)} registrado`)
    setPayDialog(false); setPayLoading(false)
  }

  return (
    <div className="p-4 pb-28 max-w-lg mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-xl font-bold text-foreground">Mis tarjetas</h1>
          <div className="flex items-center gap-1 mt-0.5">
            <button onClick={prev} className="p-0.5 rounded text-muted-foreground">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs text-muted-foreground font-medium min-w-32 text-center">{MONTHS[month - 1]} {year}</span>
            <button onClick={next} className="p-0.5 rounded text-muted-foreground">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <button
          onClick={openCreateCard}
          className="text-sm font-semibold flex items-center gap-1"
          style={{ color: '#7C4DFF' }}
        >
          <Plus className="h-4 w-4" /> Agregar tarjeta
        </button>
      </div>

      {/* Cards list */}
      {cards.length === 0 ? (
        <div className="text-center text-muted-foreground py-16 border-2 border-dashed border-border rounded-2xl">
          <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Sin tarjetas</p>
          <p className="text-sm mt-1">Agregá tu primera tarjeta de crédito</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cards.map(card => {
            const cm = getCardMonth(card.id)
            const total = cardTotal(card.id)
            const isPaid = cm?.status === 'paid'
            const dueDateStr = cm?.due_date
              ? new Date(cm.due_date + 'T12:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
              : null

            return (
              <div
                key={card.id}
                className="rounded-2xl overflow-hidden cursor-pointer select-none"
                style={{ background: NETWORK_GRADIENTS[card.network] }}
                onClick={() => { setSelectedCardId(card.id); setDetailDialog(true) }}
              >
                {/* Decorative circles */}
                <div className="relative p-5">
                  <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-white/5 pointer-events-none" />
                  <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-black/10 pointer-events-none" />

                  {/* Row 1: name + network + menu */}
                  <div className="flex items-start justify-between mb-1 relative">
                    <p className="text-white font-bold text-lg leading-tight">{card.name}</p>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <NetworkLogo network={card.network} />
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === card.id ? null : card.id)}
                          className="p-1 rounded text-white/60 hover:text-white transition-colors"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {openMenuId === card.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                            <div className="absolute right-0 top-full mt-1 z-50 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[130px]">
                              <button
                                onClick={() => { openEditCard(card); setOpenMenuId(null) }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                              >
                                <Pencil className="h-3.5 w-3.5" /> Editar
                              </button>
                              <button
                                onClick={() => { handleDeleteCard(card.id); setOpenMenuId(null) }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-muted transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Eliminar
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Digits placeholder */}
                  <p className="text-white/40 text-sm tracking-[0.25em] mb-5 relative">●●●● ●●●● ●●●●</p>

                  {/* Row 2: total factura */}
                  <div className="flex justify-between items-end mb-4 relative">
                    <div>
                      <p className="text-white/50 text-xs mb-0.5">Total factura</p>
                      <p className="text-white font-bold text-xl">{formatCurrency(total)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-white/50 text-xs mb-0.5">Estado</p>
                      <button
                        onClick={e => { e.stopPropagation(); cm && toggleStatus(cm.id, cm.status as CreditCardStatus, card.id) }}
                        className={cn(
                          'text-xs font-semibold px-2.5 py-1 rounded-full',
                          isPaid ? 'bg-[#00CB96]/25 text-[#00CB96]' : 'bg-[#FF4D6D]/25 text-[#FF4D6D]'
                        )}
                      >
                        {isPaid ? 'Pagada' : 'Pendiente'}
                      </button>
                    </div>
                  </div>

                  {/* Row 3: vencimiento */}
                  <div className="flex items-center justify-between relative">
                    <div className="flex items-center gap-1.5 text-white/60 text-xs">
                      <Calendar className="h-3 w-3" />
                      <span>{dueDateStr ? `Vence el ${dueDateStr}` : 'Sin fecha de vencimiento'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Resumen total */}
      {cards.length > 0 && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <button
            onClick={() => setSummaryOpen(v => !v)}
            className="w-full flex items-center justify-between px-5 py-4"
          >
            <span className="font-semibold text-foreground">Resumen total</span>
            {summaryOpen
              ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
              : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          {summaryOpen && (
            <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
              <div className="flex justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Total pendiente</p>
                  <p className="text-lg font-bold" style={{ color: '#FF4D6D' }}>{formatCurrency(totalPending)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground mb-0.5">Total pagado</p>
                  <p className="text-lg font-bold" style={{ color: '#00CB96' }}>{formatCurrency(totalPaid)}</p>
                </div>
              </div>
              {totalAll > 0 && (
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>Pagado del total</span>
                    <span>{Math.round((totalPaid / totalAll) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${(totalPaid / totalAll) * 100}%`, backgroundColor: '#00CB96' }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={detailDialog} onOpenChange={v => { if (!v) setDetailDialog(false) }}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden" showCloseButton={false}>
          {selectedCard && selectedMonth && (
            <>
              {/* Card visual mini header */}
              <div className="p-4 relative" style={{ background: NETWORK_GRADIENTS[selectedCard.network] }}>
                <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-bold text-base">{selectedCard.name}</p>
                    <p className="text-white/50 text-xs tracking-widest mt-0.5">●●●● ●●●● ●●●●</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <NetworkLogo network={selectedCard.network} />
                    <button
                      onClick={() => toggleStatus(selectedMonth.id, selectedMonth.status as CreditCardStatus, selectedCard?.id)}
                      className={cn(
                        'text-xs font-semibold px-2.5 py-1 rounded-full',
                        selectedMonth.status === 'paid'
                          ? 'bg-[#00CB96]/25 text-[#00CB96]'
                          : 'bg-[#FF4D6D]/25 text-[#FF4D6D]'
                      )}
                    >
                      {selectedMonth.status === 'paid' ? 'Pagada' : 'Pendiente'}
                    </button>
                    <button onClick={() => setDetailDialog(false)} className="text-white/60 hover:text-white">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div>
                    <p className="text-white/50 text-xs">Total factura</p>
                    <p className="text-white font-bold text-xl">{formatCurrency(selectedTotal)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/50 text-xs mb-1">Vencimiento</p>
                    <input
                      type="date"
                      defaultValue={selectedMonth.due_date ?? ''}
                      onBlur={e => updateDueDate(selectedMonth.id, e.target.value)}
                      className="text-xs bg-white/10 border border-white/20 rounded px-2 py-1 text-white max-w-[130px] w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Items table */}
              <div>
                <div className="grid grid-cols-[1fr_80px_80px_56px] gap-x-2 bg-muted/50 border-b border-border px-4 py-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Descripción</span>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-center">Cuota</span>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Monto</span>
                  <span />
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {selectedItems.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8 text-sm">Sin ítems. Agregá uno.</div>
                  ) : (
                    selectedItems.map(item => (
                      <div key={item.id} className="grid grid-cols-[1fr_80px_80px_56px] gap-x-2 items-center px-4 py-2.5 border-b border-border hover:bg-muted/30 transition-colors">
                        <p className="text-sm text-foreground truncate">{item.description}</p>
                        <p className="text-xs text-muted-foreground text-center">
                          {item.installment_current && item.installment_total ? `${item.installment_current}/${item.installment_total}` : '—'}
                        </p>
                        <p className="text-sm font-semibold text-foreground text-right">{formatCurrency(item.amount)}</p>
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openEditItem(item)} className="p-1 text-muted-foreground hover:text-foreground">
                            <Pencil className="h-3 w-3" />
                          </button>
                          <button onClick={() => handleDeleteItem(item.id)} className="p-1 text-muted-foreground hover:text-red-400">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="grid grid-cols-[1fr_80px_80px_56px] gap-x-2 items-center px-4 py-2.5 bg-muted/50 border-t border-border">
                  <span className="text-sm font-semibold text-foreground">Total</span>
                  <span /><span className="text-sm font-bold text-foreground text-right">{formatCurrency(selectedTotal)}</span><span />
                </div>
              </div>

              <div className="px-4 py-3 border-t border-border flex gap-2">
                <Button size="sm" variant="outline" onClick={openCreateItem} className="flex-1 justify-center">
                  <Plus className="h-3.5 w-3.5 mr-1.5" /> Agregar ítem
                </Button>
                <Button size="sm" onClick={openPayDialog} disabled={selectedMonth.status === 'paid'} className="flex-1 justify-center">
                  {selectedMonth.status === 'paid' ? 'Ya pagada' : 'Registrar pago'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Card dialog */}
      <Dialog open={cardDialog} onOpenChange={v => { if (!v) setCardDialog(false) }}>
        <DialogContent className="sm:max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCard ? 'Editar tarjeta' : 'Nueva tarjeta'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveCard} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input placeholder="Ej: Visa Galicia, MC Nación..." value={cardForm.name} onChange={e => setCardForm({ ...cardForm, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Red</Label>
              <div className="grid grid-cols-3 gap-2">
                {NETWORKS.map(n => (
                  <button key={n.value} type="button"
                    onClick={() => setCardForm({ ...cardForm, network: n.value })}
                    className={cn(
                      'px-3 py-2 rounded-xl border text-xs font-medium transition-all',
                      cardForm.network === n.value
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border text-muted-foreground hover:border-border/80'
                    )}
                  >
                    {n.label}
                  </button>
                ))}
              </div>
              {/* Preview */}
              <div className="rounded-xl p-3 mt-2" style={{ background: NETWORK_GRADIENTS[cardForm.network] }}>
                <div className="flex items-center justify-between">
                  <p className="text-white font-bold text-sm">{cardForm.name || 'Mi tarjeta'}</p>
                  <NetworkLogo network={cardForm.network} />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cuenta para pagar <span className="text-muted-foreground font-normal text-xs">(opcional)</span></Label>
              <Select value={cardForm.account_id} onValueChange={v => setCardForm({ ...cardForm, account_id: v === '__none__' ? '' : v })}>
                <SelectTrigger className="w-full">
                  <span className={cardForm.account_id ? 'text-sm' : 'text-sm text-muted-foreground'}>
                    {accounts.find(a => a.id === cardForm.account_id)?.name ?? 'Sin cuenta vinculada'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin cuenta vinculada</SelectItem>
                  {accounts.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name} · {formatCurrency(a.balance, a.currency)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">Al marcar como pagada se debitará automáticamente de esta cuenta.</p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setCardDialog(false)}>Cancelar</Button>
              <Button type="submit" disabled={cardLoading} className="flex-1">{cardLoading ? 'Guardando...' : editingCard ? 'Guardar' : 'Crear'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Item dialog */}
      <Dialog open={itemDialog} onOpenChange={v => { if (!v) setItemDialog(false) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar ítem' : 'Nuevo ítem'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveItem} className="space-y-4">
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input placeholder="Ej: Cuota bicicleta, Supermercado..." value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Cuota actual <span className="text-muted-foreground font-normal text-xs">(opcional)</span></Label>
                <Input type="number" min="1" placeholder="Ej: 2" value={itemForm.installment_current} onChange={e => setItemForm({ ...itemForm, installment_current: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Total cuotas <span className="text-muted-foreground font-normal text-xs">(opcional)</span></Label>
                <Input type="number" min="1" placeholder="Ej: 6" value={itemForm.installment_total} onChange={e => setItemForm({ ...itemForm, installment_total: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Monto</Label>
              <Input type="number" min="0" step="0.01" placeholder="0.00" value={itemForm.amount} onChange={e => setItemForm({ ...itemForm, amount: e.target.value })} required />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setItemDialog(false)}>Cancelar</Button>
              <Button type="submit" disabled={itemLoading} className="flex-1">{itemLoading ? 'Guardando...' : editingItem ? 'Guardar' : 'Agregar'}</Button>
            </div>
            {editingItem && (
              <Button type="button" variant="destructive" className="w-full" onClick={() => { handleDeleteItem(editingItem.id); setItemDialog(false) }}>
                Eliminar ítem
              </Button>
            )}
          </form>
        </DialogContent>
      </Dialog>

      {/* Pay dialog */}
      <Dialog open={payDialog} onOpenChange={v => { if (!v) setPayDialog(false) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar pago — {selectedCard?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePay} className="space-y-4">
            <div className="space-y-2">
              <Label>Cuenta a debitar</Label>
              <Select value={payForm.account_id} onValueChange={v => setPayForm({ ...payForm, account_id: v ?? '' })}>
                <SelectTrigger className="w-full">
                  <span className={payForm.account_id ? 'text-sm' : 'text-sm text-muted-foreground'}>
                    {accounts.find(a => a.id === payForm.account_id)?.name ?? 'Seleccionar cuenta'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(a => <SelectItem key={a.id} value={a.id}>{a.name} · {formatCurrency(a.balance, a.currency)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Monto a pagar</Label>
              <Input type="number" min="0" step="0.01" value={payForm.amount} onChange={e => setPayForm({ ...payForm, amount: e.target.value })} required />
              <p className="text-xs text-muted-foreground">Total factura: {formatCurrency(selectedTotal)}</p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setPayDialog(false)}>Cancelar</Button>
              <Button type="submit" disabled={payLoading} className="flex-1">{payLoading ? 'Registrando...' : 'Confirmar pago'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
