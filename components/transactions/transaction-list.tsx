'use client'

import { useState } from 'react'
import { Transaction, Account, Category, RecurringTransaction, Responsible } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, Plus, MoreVertical, Pencil, Trash2, Search, X, ChevronDown, Download, Paperclip } from 'lucide-react'
import { TransactionDialog } from './transaction-dialog'
import { RecurringList } from './recurring-list'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

const PAGE_SIZE   = 30
const TRANSFER_COLOR = '#3BB2F6'

interface Props {
  transactions: Transaction[]
  accounts: Account[]
  categories: Category[]
  responsibles: Responsible[]
  userId: string
  initialFilter?: 'all' | 'income' | 'expense'
  recurring?: RecurringTransaction[]
}

export function TransactionList({ transactions, accounts, categories, responsibles, userId, initialFilter = 'all', recurring = [] }: Props) {
  const [dialogOpen, setDialogOpen]       = useState(false)
  const [editing, setEditing]             = useState<Transaction | null>(null)
  const [filter, setFilter]               = useState<'all' | 'income' | 'expense'>(initialFilter)
  const [catFilter, setCatFilter]         = useState('')
  const [accFilter, setAccFilter]         = useState('')
  const [deleting, setDeleting]           = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null)
  const [search, setSearch]               = useState('')
  const [allLoaded, setAllLoaded]         = useState<Transaction[]>(transactions)
  const [hasMore, setHasMore]             = useState(transactions.length === PAGE_SIZE)
  const [loadingMore, setLoadingMore]     = useState(false)
  const [lightboxUrl, setLightboxUrl]     = useState<string | null>(null)
  const [lightboxLoading, setLightboxLoading] = useState(false)

  const router   = useRouter()
  const supabase = createClient()

  const q = search.trim().toLowerCase()
  const filtered = allLoaded.filter(t => {
    if (filter !== 'all' && t.type !== filter) return false
    if (catFilter && t.category_id !== catFilter) return false
    if (accFilter && t.account_id !== accFilter) return false
    if (!q) return true
    return (
      t.description?.toLowerCase().includes(q) ||
      (t.category as any)?.name?.toLowerCase().includes(q) ||
      (t.account as any)?.name?.toLowerCase().includes(q)
    )
  })

  async function loadMore() {
    setLoadingMore(true)
    const { data } = await supabase
      .from('transactions')
      .select('*, category:categories(*), account:accounts(*), responsible:responsible_parties(*)')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(allLoaded.length, allLoaded.length + PAGE_SIZE - 1)

    if (data) {
      setAllLoaded(prev => [...prev, ...data as any[]])
      setHasMore(data.length === PAGE_SIZE)
    }
    setLoadingMore(false)
  }

  function openCreate() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(t: Transaction) {
    setEditing(t)
    setTimeout(() => setDialogOpen(true), 50)
  }

  function handleSaved(data: { id: string; type: 'income' | 'expense'; amount: number; description: string; date: string; account_id: string; category_id: string; notes: string | null; responsible_party_id: string | null; attachment_url: string | null }) {
    const account     = accounts.find(a => a.id === data.account_id)
    const category    = categories.find(c => c.id === data.category_id)
    const responsible = responsibles.find(r => r.id === data.responsible_party_id)
    setAllLoaded(prev => prev.map(t =>
      t.id === data.id ? { ...t, ...data, account, category, responsible } : t
    ))
  }

  async function openAttachment(t: Transaction) {
    if (!t.attachment_url) return
    const isPdf = t.attachment_url.toLowerCase().endsWith('.pdf')
    setLightboxLoading(true)
    const { data } = await supabase.storage
      .from('transaction-attachments')
      .createSignedUrl(t.attachment_url, 300)
    setLightboxLoading(false)
    if (!data) return
    if (isPdf) {
      window.open(data.signedUrl, '_blank')
    } else {
      setLightboxUrl(data.signedUrl)
    }
  }

  function exportCSV() {
    const rows = [
      ['Fecha', 'Descripción', 'Tipo', 'Monto', 'Cuenta', 'Categoría', 'Notas'],
      ...filtered.map(t => [
        t.date,
        t.description,
        t.transfer_group_id ? 'Transferencia' : t.type === 'income' ? 'Ingreso' : 'Gasto',
        t.transfer_group_id ? t.amount : t.type === 'income' ? t.amount : -t.amount,
        (t.account as any)?.name ?? '',
        t.transfer_group_id ? 'Transferencia' : (t.category as any)?.name ?? '',
        t.notes ?? '',
      ]),
    ]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `transacciones.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDelete(t: Transaction) {
    setDeleting(t.id)
    setPendingDelete(null)

    if (t.transfer_group_id) {
      const { data: pair } = await supabase
        .from('transactions')
        .select('id')
        .eq('transfer_group_id', t.transfer_group_id)
        .neq('id', t.id)
        .single()

      if (pair) await supabase.from('transactions').delete().eq('id', pair.id)

      const { error } = await supabase.from('transactions').delete().eq('id', t.id)
      if (error) toast.error('Error al eliminar')
      else {
        setAllLoaded(prev => prev.filter(x => x.transfer_group_id !== t.transfer_group_id))
        toast.success('Transferencia eliminada')
        router.refresh()
      }
    } else {
      const { error } = await supabase.from('transactions').delete().eq('id', t.id)
      if (error) toast.error('Error al eliminar')
      else {
        if (t.attachment_url) {
          await supabase.storage.from('transaction-attachments').remove([t.attachment_url])
        }
        setAllLoaded(prev => prev.filter(x => x.id !== t.id))
        toast.success('Transacción eliminada')
        router.refresh()
      }
    }

    setDeleting(null)
  }

  const FILTERS: { key: 'all' | 'income' | 'expense'; label: string }[] = [
    { key: 'all',     label: 'Todos' },
    { key: 'income',  label: 'Ingresos' },
    { key: 'expense', label: 'Gastos' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Transacciones</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            title="Exportar CSV"
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            <Download className="h-4 w-4" />
          </button>
          <Button
            onClick={openCreate}
            size="sm"
            style={{ background: 'linear-gradient(135deg, #7C4DFF 0%, #9C6DFF 100%)', color: '#fff', border: 'none' }}
          >
            <Plus className="h-4 w-4 mr-1" /> Nueva
          </Button>
        </div>
      </div>

      {/* Recurrentes */}
      {recurring.length > 0 && (
        <RecurringList
          recurring={recurring}
          accounts={accounts}
          categories={categories}
          userId={userId}
        />
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por descripción, categoría o cuenta..."
          className="w-full h-10 pl-9 pr-9 rounded-xl border border-border bg-muted/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#7C4DFF]/40 focus:border-[#7C4DFF]/60 transition-all"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setFilter(key); setCatFilter('') }}
            className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
            style={filter === key
              ? { background: '#7C4DFF20', borderColor: '#7C4DFF60', color: '#7C4DFF' }
              : { background: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }
            }
          >
            {label}
          </button>
        ))}

        {/* Categoría dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
            style={catFilter
              ? { background: '#3BB2F620', borderColor: '#3BB2F660', color: '#3BB2F6' }
              : { background: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }
            }
          >
            {catFilter ? categories.find(c => c.id === catFilter)?.name ?? 'Categoría' : 'Categoría'}
            <ChevronDown className="h-3 w-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
            {catFilter && (
              <>
                <DropdownMenuItem onClick={() => setCatFilter('')}>
                  <X className="h-3.5 w-3.5 mr-2" /> Todas las categorías
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {categories
              .filter(c => filter === 'all' ? true : c.type === filter)
              .map(c => (
                <DropdownMenuItem key={c.id} onClick={() => setCatFilter(c.id)}>
                  <span className="mr-2">{c.icon}</span> {c.name}
                </DropdownMenuItem>
              ))
            }
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Cuenta dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
            style={accFilter
              ? { background: '#00CB9620', borderColor: '#00CB9660', color: '#00CB96' }
              : { background: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }
            }
          >
            {accFilter ? accounts.find(a => a.id === accFilter)?.name ?? 'Cuenta' : 'Cuenta'}
            <ChevronDown className="h-3 w-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {accFilter && (
              <>
                <DropdownMenuItem onClick={() => setAccFilter('')}>
                  <X className="h-3.5 w-3.5 mr-2" /> Todas las cuentas
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {accounts.map(a => (
              <DropdownMenuItem key={a.id} onClick={() => setAccFilter(a.id)}>
                <div className="h-2.5 w-2.5 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: a.color }} />
                {a.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center text-muted-foreground py-12 text-sm">
              {q ? `Sin resultados para "${search}"` : 'No hay transacciones'}
            </div>
          ) : (() => {
            // Group by date
            const groups: Record<string, Transaction[]> = {}
            for (const t of filtered) {
              if (!groups[t.date]) groups[t.date] = []
              groups[t.date].push(t)
            }
            const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a))

            return (
              <div>
                {sortedDates.map(date => (
                  <div key={date}>
                    {/* Date header */}
                    <div className="px-4 py-2 bg-muted/40 border-b border-border/40 sticky top-0 z-10">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                        {formatDate(date)}
                      </span>
                    </div>
                    {/* Rows for this date */}
                    <div className="divide-y divide-border/50">
                      {groups[date].map(t => {
                        const isTransfer = !!t.transfer_group_id
                        return (
                          <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                            <div
                              className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: isTransfer
                                ? TRANSFER_COLOR + '18'
                                : t.type === 'income' ? '#00CB9618' : '#FF4D6D18'
                              }}
                            >
                              {isTransfer
                                ? <ArrowLeftRight className="h-4 w-4" style={{ color: TRANSFER_COLOR }} />
                                : t.type === 'income'
                                  ? <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
                                  : <ArrowDownCircle className="h-4 w-4 text-red-500" />
                              }
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-medium text-foreground truncate">{t.description}</p>
                                {t.attachment_url && (
                                  <button
                                    type="button"
                                    onClick={() => openAttachment(t)}
                                    title="Ver comprobante"
                                    className="flex-shrink-0 text-muted-foreground/50 hover:text-[#7C4DFF] transition-colors"
                                  >
                                    <Paperclip className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                {(t.account as any)?.name  ? `${(t.account as any).name}`   : ''}
                                {!isTransfer && (t.category as any)?.name ? ` · ${(t.category as any).name}` : ''}
                                {isTransfer && <span style={{ color: TRANSFER_COLOR }}> · Transferencia</span>}
                              </p>
                              {t.notes && (
                                <p className="text-[11px] text-muted-foreground/60 mt-0.5 truncate italic">{t.notes}</p>
                              )}
                            </div>

                            <span
                              className="text-sm font-bold tabular-nums flex-shrink-0"
                              style={{ color: isTransfer
                                ? TRANSFER_COLOR
                                : t.type === 'income' ? '#00CB96' : '#FF4D6D'
                              }}
                            >
                              {isTransfer ? '' : t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                            </span>

                            <DropdownMenu>
                              <DropdownMenuTrigger className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-muted/60 transition-colors flex-shrink-0">
                                <MoreVertical className="h-4 w-4" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {!isTransfer && (
                                  <>
                                    <DropdownMenuItem onClick={() => openEdit(t)}>
                                      <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                  </>
                                )}
                                <DropdownMenuItem
                                  className="text-red-500"
                                  disabled={deleting === t.id}
                                  onClick={() => setPendingDelete(t)}
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                                  {deleting === t.id ? 'Eliminando...' : 'Eliminar'}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}
        </CardContent>
      </Card>

      {/* Load more */}
      {hasMore && !q && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          className="w-full py-3 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all disabled:opacity-50"
        >
          {loadingMore ? 'Cargando...' : 'Cargar más transacciones'}
        </button>
      )}

      {/* Confirmation dialog */}
      <Dialog open={!!pendingDelete} onOpenChange={() => setPendingDelete(null)}>
        <DialogContent className="sm:max-w-xs p-0 gap-0 border-border overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-border"
            style={{ background: 'linear-gradient(135deg, #FF4D6D12 0%, transparent 100%)' }}>
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FF4D6D20' }}>
                <Trash2 className="h-4 w-4" style={{ color: '#FF4D6D' }} />
              </div>
              <DialogTitle className="text-base font-semibold text-foreground">
                {pendingDelete?.transfer_group_id ? 'Eliminar transferencia' : 'Eliminar transacción'}
              </DialogTitle>
            </div>
          </div>
          <div className="px-5 py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              {pendingDelete?.transfer_group_id
                ? 'Se eliminarán ambas partes de la transferencia y se revertirán los saldos de las dos cuentas.'
                : 'Se eliminará la transacción y se revertirá el saldo de la cuenta.'
              }
            </p>
            {pendingDelete && (
              <div className="bg-muted/40 rounded-xl px-3 py-2.5 flex items-center justify-between">
                <span className="text-sm font-medium text-foreground truncate">{pendingDelete.description}</span>
                <span className="text-sm font-bold tabular-nums text-red-500 flex-shrink-0 ml-2">
                  -{formatCurrency(pendingDelete.amount)}
                </span>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setPendingDelete(null)}>
                Cancelar
              </Button>
              <Button
                className="flex-1 font-semibold"
                disabled={deleting === pendingDelete?.id}
                onClick={() => pendingDelete && handleDelete(pendingDelete)}
                style={{ backgroundColor: '#FF4D6D', color: '#fff', border: 'none' }}
              >
                {deleting === pendingDelete?.id ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <TransactionDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null) }}
        accounts={accounts}
        categories={categories}
        responsibles={responsibles}
        userId={userId}
        editingTransaction={editing}
        onSaved={handleSaved}
      />

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 h-9 w-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
          >
            <X className="h-5 w-5" />
          </button>
          <a
            href={lightboxUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white text-xs font-medium"
          >
            <Download className="h-3.5 w-3.5" />
            Abrir en nueva pestaña
          </a>
          <img
            src={lightboxUrl}
            alt="comprobante"
            onClick={e => e.stopPropagation()}
            className="max-w-full max-h-full rounded-xl object-contain shadow-2xl"
            style={{ maxHeight: 'calc(100vh - 80px)' }}
          />
        </div>
      )}

      {/* Lightbox loading overlay */}
      {lightboxLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
        </div>
      )}
    </div>
  )
}
