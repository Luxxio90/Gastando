'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Account, Category, Transaction, Responsible } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { TrendingUp, TrendingDown, Repeat, Paperclip, X, FileText } from 'lucide-react'
import imageCompression from 'browser-image-compression'

const INCOME_COLOR  = '#00CB96'
const EXPENSE_COLOR = '#FF4D6D'

interface Props {
  open: boolean
  onClose: () => void
  accounts: Account[]
  categories: Category[]
  responsibles: Responsible[]
  userId: string
  defaultType?: 'income' | 'expense'
  defaultAccountId?: string
  editingTransaction?: Transaction | null
  onSaved?: (data: {
    id: string; type: 'income' | 'expense'; amount: number; description: string
    date: string; account_id: string; category_id: string; notes: string | null
    responsible_party_id: string | null; attachment_url: string | null
  }) => void
}

const todayLocal = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

const emptyForm = (type: 'income' | 'expense', accountId: string) => ({
  type,
  amount: '',
  description: '',
  date: todayLocal(),
  account_id: accountId,
  category_id: '',
  notes: '',
  responsible_party_id: '',
})

export function TransactionDialog({
  open, onClose, accounts, categories, responsibles, userId,
  defaultType = 'expense', defaultAccountId = '',
  editingTransaction, onSaved,
}: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(emptyForm(defaultType, defaultAccountId))
  const [recurring, setRecurring] = useState(false)
  const [recurringDay, setRecurringDay] = useState('1')

  // Attachment state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [attachmentFile, setAttachmentFile]       = useState<File | null>(null)
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null)
  const [existingPath, setExistingPath]           = useState<string | null>(null)
  const [existingSignedUrl, setExistingSignedUrl] = useState<string | null>(null)
  const [removeExisting, setRemoveExisting]       = useState(false)

  useEffect(() => {
    if (editingTransaction) {
      setForm({
        type: editingTransaction.type as 'income' | 'expense',
        amount: editingTransaction.amount.toString(),
        description: editingTransaction.description,
        date: editingTransaction.date,
        account_id: editingTransaction.account_id,
        category_id: editingTransaction.category_id,
        notes: editingTransaction.notes ?? '',
        responsible_party_id: editingTransaction.responsible_party_id ?? '',
      })
      const path = editingTransaction.attachment_url ?? null
      setExistingPath(path)
      setExistingSignedUrl(null)
      setRemoveExisting(false)
      setAttachmentFile(null)
      setAttachmentPreview(null)

      if (path) {
        supabase.storage.from('transaction-attachments')
          .createSignedUrl(path, 300)
          .then(({ data }) => { if (data) setExistingSignedUrl(data.signedUrl) })
      }
    } else {
      setForm(emptyForm(defaultType, defaultAccountId))
      setRecurring(false)
      setRecurringDay('1')
      setExistingPath(null)
      setExistingSignedUrl(null)
      setRemoveExisting(false)
      setAttachmentFile(null)
      setAttachmentPreview(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingTransaction, defaultType, defaultAccountId, open])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    let processed = file
    if (file.type.startsWith('image/')) {
      try {
        processed = await imageCompression(file, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        })
      } catch { /* use original */ }
    }

    if (attachmentPreview) URL.revokeObjectURL(attachmentPreview)
    setAttachmentFile(processed)
    setAttachmentPreview(URL.createObjectURL(processed))
    setRemoveExisting(false)
  }

  function clearNewFile() {
    if (attachmentPreview) URL.revokeObjectURL(attachmentPreview)
    setAttachmentFile(null)
    setAttachmentPreview(null)
  }

  const filteredCategories = categories.filter(c =>
    c.type === form.type &&
    !(form.type === 'expense' && c.expense_type?.name === 'Gasto fijo')
  )
  const activeColor = form.type === 'income' ? INCOME_COLOR : EXPENSE_COLOR
  const isEditing   = !!editingTransaction

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.account_id)  { toast.error('Seleccioná una cuenta');    return }
    if (!form.category_id) { toast.error('Seleccioná una categoría'); return }

    setLoading(true)
    const amount = parseFloat(form.amount)

    // ── Resolve final attachment_url ────────────────────────────
    let finalAttachmentUrl: string | null = existingPath

    if (removeExisting && existingPath) {
      await supabase.storage.from('transaction-attachments').remove([existingPath])
      finalAttachmentUrl = null
    }

    if (attachmentFile) {
      const isPdf = attachmentFile.type === 'application/pdf'
      const ext   = isPdf ? 'pdf'
        : attachmentFile.type === 'image/png'  ? 'png'
        : attachmentFile.type === 'image/webp' ? 'webp'
        : 'jpg'
      const path = `${userId}/${crypto.randomUUID()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('transaction-attachments').upload(path, attachmentFile)

      if (uploadError) {
        toast.error('Error al subir el comprobante')
        setLoading(false)
        return
      }

      if (existingPath && !removeExisting) {
        await supabase.storage.from('transaction-attachments').remove([existingPath])
      }
      finalAttachmentUrl = path
    }
    // ────────────────────────────────────────────────────────────

    if (isEditing) {
      const editPayload = {
        type: form.type,
        amount,
        description: form.description,
        date: form.date,
        account_id: form.account_id,
        category_id: form.category_id,
        notes: form.notes || null,
        responsible_party_id: form.responsible_party_id || null,
        attachment_url: finalAttachmentUrl,
      }
      const { error } = await supabase.from('transactions').update(editPayload as any).eq('id', editingTransaction!.id)
      if (error) {
        toast.error('Error al guardar: ' + error.message)
      } else {
        onSaved?.({ id: editingTransaction!.id, ...editPayload })
        toast.success('Transacción actualizada')
        onClose()
        router.refresh()
      }
      setLoading(false)
      return
    }

    let recurringId: string | null = null
    if (recurring) {
      const { data: rt, error: rtError } = await supabase
        .from('recurring_transactions')
        .insert({
          user_id: userId, type: form.type, amount,
          description: form.description, category_id: form.category_id,
          account_id: form.account_id,
          day_of_month: Math.min(Math.max(parseInt(recurringDay) || 1, 1), 28),
          notes: form.notes || null,
        })
        .select().single()

      if (rtError) { toast.error('Error al crear recurrente: ' + rtError.message); setLoading(false); return }
      recurringId = rt.id
    }

    const payload = {
      user_id: userId, type: form.type, amount,
      description: form.description, date: form.date,
      account_id: form.account_id, category_id: form.category_id,
      notes: form.notes || null, recurring_transaction_id: recurringId,
      responsible_party_id: form.responsible_party_id || null,
      attachment_url: finalAttachmentUrl,
    }

    const { error } = await supabase.from('transactions').insert(payload as any)
    if (error) toast.error('Error al guardar: ' + error.message)
    else {
      toast.success(recurring ? 'Transacción registrada y recurrente creada' : 'Transacción registrada')
      onClose()
      router.refresh()
    }

    setLoading(false)
  }

  const showExisting   = isEditing && !!existingPath && !removeExisting && !attachmentFile
  const showNewPreview = !!attachmentFile && !!attachmentPreview
  const showPicker     = !showNewPreview && !showExisting

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 border-border">
        {/* Header */}
        <div
          className="px-5 pt-5 pb-4 border-b border-border flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${activeColor}18 0%, transparent 100%)` }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ backgroundColor: activeColor + '22' }}
            >
              {form.type === 'income'
                ? <TrendingUp  className="h-4 w-4" style={{ color: activeColor }} />
                : <TrendingDown className="h-4 w-4" style={{ color: activeColor }} />
              }
            </div>
            <DialogTitle className="text-base font-semibold text-foreground">
              {isEditing ? 'Editar transacción' : form.type === 'income' ? 'Nuevo ingreso' : 'Nuevo gasto'}
            </DialogTitle>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* Tipo */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              {(['expense', 'income'] as const).map(t => {
                const color  = t === 'income' ? INCOME_COLOR : EXPENSE_COLOR
                const active = form.type === t
                return (
                  <button
                    key={t} type="button"
                    onClick={() => setForm({ ...form, type: t, category_id: '' })}
                    className="py-2.5 rounded-xl text-sm font-bold border transition-all"
                    style={active
                      ? { backgroundColor: color + '20', borderColor: color + '60', color }
                      : { backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }
                    }
                  >
                    {t === 'income' ? '↑ Ingreso' : '↓ Gasto'}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Monto */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Monto</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground/60">$</span>
              <Input
                type="number" min="0" step="0.01" placeholder="0.00"
                value={form.amount}
                onChange={e => setForm({ ...form, amount: e.target.value })}
                required
                className="pl-8 h-14 text-2xl font-bold bg-muted/40 border-border/60 tracking-tight"
                style={{ color: activeColor }}
              />
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Descripción</label>
            <Input
              placeholder="Ej: Supermercado, Sueldo..."
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              required
              className="bg-muted/40 border-border/60"
            />
          </div>

          {/* Fecha */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Fecha</label>
            <Input
              type="date"
              value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
              required
              className="bg-muted/40 border-border/60"
            />
          </div>

          {/* Cuenta */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Cuenta</label>
            {accounts.length === 0 ? (
              <p className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 p-2.5 rounded-lg">
                No tenés cuentas. Creá una en la sección Cuentas.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {accounts.map(a => {
                  const active = form.account_id === a.id
                  return (
                    <button
                      key={a.id} type="button"
                      onClick={() => setForm({ ...form, account_id: a.id })}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all"
                      style={active
                        ? { backgroundColor: a.color + '20', borderColor: a.color + '60', color: 'hsl(var(--foreground))' }
                        : { backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }
                      }
                    >
                      <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />
                      {a.name}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Categoría */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Categoría</label>
            {filteredCategories.length === 0 ? (
              <p className="text-xs text-muted-foreground bg-muted/40 border border-border p-2.5 rounded-lg">
                No hay categorías para este tipo. Creá una en Ajustes → Categorías.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-0.5">
                {filteredCategories.map(c => {
                  const active = form.category_id === c.id
                  const color  = c.color || '#7C4DFF'
                  return (
                    <button
                      key={c.id} type="button"
                      onClick={() => setForm({ ...form, category_id: c.id })}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all text-left"
                      style={active
                        ? { backgroundColor: color + '20', borderColor: color + '60', color: 'hsl(var(--foreground))' }
                        : { backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }
                      }
                    >
                      <span className="text-base leading-none flex-shrink-0">{c.icon}</span>
                      <span className="truncate">{c.name}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Notas */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              Notas <span className="normal-case font-normal text-muted-foreground/60">(opcional)</span>
            </label>
            <Input
              placeholder="Observaciones..."
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              className="bg-muted/40 border-border/60"
            />
          </div>

          {/* Encargado */}
          {responsibles.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                Encargado <span className="normal-case font-normal text-muted-foreground/60">(opcional)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {responsibles.map(r => {
                  const active = form.responsible_party_id === r.id
                  return (
                    <button
                      key={r.id} type="button"
                      onClick={() => setForm({ ...form, responsible_party_id: active ? '' : r.id })}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all"
                      style={active
                        ? { backgroundColor: r.color + '20', borderColor: r.color + '60', color: 'hsl(var(--foreground))' }
                        : { backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }
                      }
                    >
                      <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
                      {r.name}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Comprobante */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
              Comprobante <span className="normal-case font-normal text-muted-foreground/60">(opcional)</span>
            </label>

            {/* Vista previa adjunto existente */}
            {showExisting && (
              <div className="flex items-center gap-3 p-2.5 rounded-xl border border-border bg-muted/30">
                {existingSignedUrl && !existingPath?.endsWith('.pdf') ? (
                  <img src={existingSignedUrl} alt="comprobante" className="h-12 w-12 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-muted/60 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">Comprobante adjunto</p>
                  {existingSignedUrl && (
                    <a
                      href={existingSignedUrl} target="_blank" rel="noopener noreferrer"
                      className="text-[11px] hover:underline" style={{ color: '#7C4DFF' }}
                    >
                      Ver archivo
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button" title="Reemplazar"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  >
                    <Paperclip className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button" title="Quitar"
                    onClick={() => setRemoveExisting(true)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Vista previa archivo nuevo */}
            {showNewPreview && (
              <div className="flex items-center gap-3 p-2.5 rounded-xl border border-border bg-muted/30">
                {attachmentFile!.type.startsWith('image/') ? (
                  <img src={attachmentPreview!} alt="preview" className="h-12 w-12 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-muted/60 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{attachmentFile!.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {attachmentFile!.size < 1024 * 1024
                      ? `${(attachmentFile!.size / 1024).toFixed(0)} KB`
                      : `${(attachmentFile!.size / 1024 / 1024).toFixed(1)} MB`}
                  </p>
                </div>
                <button
                  type="button" onClick={clearNewFile}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Botón adjuntar */}
            {showPicker && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed text-sm text-muted-foreground hover:text-foreground transition-all"
                style={{ borderColor: 'hsl(var(--border))' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#7C4DFF60'; (e.currentTarget as HTMLButtonElement).style.background = '#7C4DFF08' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = ''; (e.currentTarget as HTMLButtonElement).style.background = '' }}
              >
                <Paperclip className="h-4 w-4" />
                Adjuntar comprobante
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Repetir mensualmente (solo al crear) */}
          {!isEditing && (
            <div
              className="rounded-xl border overflow-hidden transition-colors"
              style={recurring ? { borderColor: '#7C4DFF50' } : { borderColor: 'hsl(var(--border))' }}
            >
              <div
                className="flex items-center justify-between px-3 py-3 cursor-pointer"
                style={recurring ? { backgroundColor: '#7C4DFF08' } : {}}
                onClick={() => setRecurring(!recurring)}
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: recurring ? '#7C4DFF20' : 'hsl(var(--muted))' }}>
                    <Repeat className="h-3.5 w-3.5" style={{ color: recurring ? '#7C4DFF' : 'hsl(var(--muted-foreground))' }} />
                  </div>
                  <span className="text-sm font-medium text-foreground">Repetir mensualmente</span>
                </div>
                <div
                  className="relative h-5 w-9 rounded-full transition-colors flex-shrink-0"
                  style={{ backgroundColor: recurring ? '#7C4DFF' : 'hsl(var(--muted))' }}
                >
                  <span
                    className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
                    style={{ transform: recurring ? 'translateX(16px)' : 'translateX(2px)' }}
                  />
                </div>
              </div>

              {recurring && (
                <div
                  className="flex items-center justify-between px-3 py-2.5 border-t"
                  style={{ borderColor: '#7C4DFF30', backgroundColor: '#7C4DFF05' }}
                  onClick={e => e.stopPropagation()}
                >
                  <span className="text-sm text-muted-foreground">Día del mes</span>
                  <input
                    type="number" min={1} max={28}
                    value={recurringDay}
                    onChange={e => setRecurringDay(e.target.value)}
                    className="w-16 h-8 text-center text-sm font-bold rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#7C4DFF]/40"
                    style={{ borderColor: '#7C4DFF40' }}
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit" disabled={loading}
              className="flex-1 font-semibold"
              style={{
                background: `linear-gradient(135deg, ${activeColor} 0%, ${activeColor}cc 100%)`,
                color: '#fff', border: 'none',
              }}
            >
              {loading ? 'Guardando...' : isEditing ? 'Guardar' : 'Registrar'}
            </Button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  )
}
