'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Plus, CalendarDays, TrendingDown, MoreVertical, Layers, Check, ChevronDown, Download, ArrowUpDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Account, Category, FixedExpenseGroup, FixedExpenseItem, FixedExpenseStatus, Responsible } from '@/types'

const GROUP_COLORS = ['#7C4DFF', '#00CB96', '#3BB2F6', '#FF4D6D', '#F59E0B', '#EC4899', '#10b981', '#f97316']

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

type PrevGroupData = {
  id: string
  name: string
  color: string
  order: number
  itemCount: number
}

interface Props {
  groups: FixedExpenseGroup[]
  items: FixedExpenseItem[]
  fixedCategories: Category[]
  responsibles: Responsible[]
  accounts: Account[]
  userId: string
  month: number
  year: number
}

type ItemForm = {
  category_id: string
  description: string
  amount: string
  status: FixedExpenseStatus
  responsible: string
  due_day: string
  account_id: string
}

const emptyItemForm: ItemForm = {
  category_id: '', description: '', amount: '', status: 'pending', responsible: '', due_day: '', account_id: '',
}

const STATUS_OPTS: { value: FixedExpenseStatus; label: string; color: string; bg: string; border: string }[] = [
  { value: 'paid',           label: 'Pagado',         color: '#00CB96', bg: '#00CB9618', border: '#00CB9640' },
  { value: 'pending',        label: 'Pendiente',      color: '#FF4D6D', bg: '#FF4D6D18', border: '#FF4D6D40' },
  { value: 'not_applicable', label: 'No corresponde', color: '#F59E0B', bg: '#F59E0B18', border: '#F59E0B40' },
]

function statusColor(s: FixedExpenseStatus) { return STATUS_OPTS.find(o => o.value === s)?.color ?? '#888' }
function statusLabel(s: FixedExpenseStatus) { return STATUS_OPTS.find(o => o.value === s)?.label ?? s }

export function FixedExpensesTable({ groups: initialGroups, items: initialItems, fixedCategories, responsibles, accounts, userId, month, year }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [localGroups, setLocalGroups] = useState<FixedExpenseGroup[]>(initialGroups)
  const [localItems, setLocalItems] = useState<FixedExpenseItem[]>(initialItems)

  // ── Item dialog ───────────────────────────────────────────────────────────────
  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<FixedExpenseItem | null>(null)
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null)
  const [itemForm, setItemForm] = useState<ItemForm>(emptyItemForm)
  const [itemLoading, setItemLoading] = useState(false)
  const [itemDeleting, setItemDeleting] = useState(false)

  // ── Collapsed state ───────────────────────────────────────────────────────────
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  function toggleCollapse(groupId: string) {
    setCollapsedGroups(prev => {
      const next = new Set(prev)
      next.has(groupId) ? next.delete(groupId) : next.add(groupId)
      return next
    })
  }

  // ── Sort by status per group ──────────────────────────────────────────────────
  const STATUS_SORT_ORDER: Record<1 | 2 | 3, Record<string, number>> = {
    1: { paid: 0, pending: 1, not_applicable: 2 },
    2: { pending: 0, paid: 1, not_applicable: 2 },
    3: { not_applicable: 0, paid: 1, pending: 2 },
  }
  const [sortByStatus, setSortByStatus] = useState<Record<string, 0 | 1 | 2 | 3>>({})

  function cycleSortStatus(groupId: string) {
    setSortByStatus(prev => ({ ...prev, [groupId]: (((prev[groupId] ?? 0) + 1) % 4) as 0 | 1 | 2 | 3 }))
  }

  // ── Import dialog ─────────────────────────────────────────────────────────────
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [prevGroupsData, setPrevGroupsData] = useState<PrevGroupData[]>([])
  const [selectedImportIds, setSelectedImportIds] = useState<Set<string>>(new Set())
  const [loadingPrev, setLoadingPrev] = useState(false)
  const [importing, setImporting] = useState(false)

  const prevMonthNum = month === 1 ? 12 : month - 1
  const prevYearNum  = month === 1 ? year - 1 : year

  async function openImportDialog() {
    setLoadingPrev(true)
    setImportDialogOpen(true)
    setPrevGroupsData([])
    setSelectedImportIds(new Set())

    const { data: prevGroups } = await supabase
      .from('fixed_expense_groups').select('*')
      .eq('user_id', userId).eq('month', prevMonthNum).eq('year', prevYearNum).order('order')

    if (!prevGroups || prevGroups.length === 0) {
      setLoadingPrev(false)
      return
    }

    const { data: prevItems } = await supabase
      .from('fixed_expense_items').select('id, group_id')
      .eq('user_id', userId).eq('month', prevMonthNum).eq('year', prevYearNum)

    const countByGroup: Record<string, number> = {}
    for (const item of (prevItems ?? [])) {
      if (item.group_id) countByGroup[item.group_id] = (countByGroup[item.group_id] ?? 0) + 1
    }

    const grouped = prevGroups.map(g => ({
      id: g.id, name: g.name, color: g.color, order: g.order,
      itemCount: countByGroup[g.id] ?? 0,
    }))
    setPrevGroupsData(grouped)
    setSelectedImportIds(new Set(grouped.map(g => g.id)))
    setLoadingPrev(false)
  }

  function closeImportDialog() {
    if (importing) return
    setImportDialogOpen(false)
    setPrevGroupsData([])
    setSelectedImportIds(new Set())
  }

  function toggleImportSelection(id: string) {
    setSelectedImportIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleImport() {
    if (selectedImportIds.size === 0) return
    setImporting(true)

    const toImport = prevGroupsData.filter(g => selectedImportIds.has(g.id))

    const { data: insertedGroups, error: gErr } = await supabase
      .from('fixed_expense_groups')
      .insert(toImport.map((g, i) => ({
        user_id: userId, month, year,
        name: g.name, color: g.color,
        order: localGroups.length + i,
      })))
      .select()

    if (gErr || !insertedGroups) {
      toast.error('Error al importar secciones')
      setImporting(false)
      return
    }

    const groupIdMap: Record<string, string> = {}
    toImport.forEach((oldG, i) => { if (insertedGroups[i]) groupIdMap[oldG.id] = insertedGroups[i].id })

    const { data: prevItems } = await supabase
      .from('fixed_expense_items').select('*')
      .eq('user_id', userId).eq('month', prevMonthNum).eq('year', prevYearNum)
      .in('group_id', toImport.map(g => g.id))

    let insertedItems: FixedExpenseItem[] = []
    if (prevItems && prevItems.length > 0) {
      const { data: newItems } = await supabase
        .from('fixed_expense_items')
        .insert(prevItems.map(item => ({
          user_id: userId, month, year,
          group_id: item.group_id ? (groupIdMap[item.group_id] ?? null) : null,
          category_id: item.category_id,
          description: item.description,
          responsible: item.responsible,
          due_day: item.due_day,
          amount: 0,
          status: 'pending',
        })))
        .select('*, category:categories(id,name,icon,color)')
      insertedItems = (newItems ?? []) as FixedExpenseItem[]
    }

    const n = insertedGroups.length
    toast.success(`${n} sección${n !== 1 ? 'es' : ''} importada${n !== 1 ? 's' : ''}`)
    setLocalGroups(prev => [...prev, ...(insertedGroups as FixedExpenseGroup[])])
    setLocalItems(prev => [...prev, ...insertedItems])
    closeImportDialog()
    setImporting(false)
  }

  // ── Group dialog ──────────────────────────────────────────────────────────────
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<FixedExpenseGroup | null>(null)
  const [groupForm, setGroupForm] = useState({ name: '', color: '#7C4DFF' })
  const [groupLoading, setGroupLoading] = useState(false)
  const [groupDeleting, setGroupDeleting] = useState(false)

  // ── Item handlers ─────────────────────────────────────────────────────────────
  function openCreateItem(groupId: string) {
    setEditingItem(null)
    setActiveGroupId(groupId)
    setItemForm(emptyItemForm)
    setItemDialogOpen(true)
  }

  function openEditItem(item: FixedExpenseItem) {
    setEditingItem(item)
    setActiveGroupId(item.group_id)
    setItemForm({
      category_id: item.category_id ?? '',
      description: item.description ?? '',
      amount: item.amount.toString(),
      status: item.status as FixedExpenseStatus,
      responsible: item.responsible ?? '',
      due_day: item.due_day?.toString() ?? '',
      account_id: item.account_id ?? '',
    })
    setItemDialogOpen(true)
  }

  function closeItemDialog() {
    setItemDialogOpen(false)
    setEditingItem(null)
    setActiveGroupId(null)
    setItemForm(emptyItemForm)
  }

  async function handleItemSubmit(e: React.FormEvent) {
    e.preventDefault()
    setItemLoading(true)
    const amount = parseFloat(itemForm.amount) || 0
    const payload = {
      user_id: userId, month, year,
      group_id: activeGroupId,
      category_id: itemForm.category_id || null,
      description: itemForm.description.trim() || null,
      amount,
      status: itemForm.status,
      responsible: itemForm.responsible.trim() || null,
      due_day: itemForm.due_day ? parseInt(itemForm.due_day) : null,
      account_id: itemForm.account_id || null,
    }
    const { error, data: saved } = editingItem
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? await supabase.from('fixed_expense_items').update(payload as any).eq('id', editingItem.id)
          .select('*, category:categories(id,name,icon,color)').single()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      : await supabase.from('fixed_expense_items').insert(payload as any)
          .select('*, category:categories(id,name,icon,color)').single()

    if (error) {
      toast.error('Error al guardar')
    } else {
      // Create transaction if marking as paid with an account selected
      const isNewlyPaid = itemForm.status === 'paid' && (!editingItem || editingItem.status !== 'paid')
      if (isNewlyPaid && itemForm.account_id && amount > 0) {
        const desc = itemForm.description.trim() || (saved as any)?.category?.name || 'Gasto fijo'
        const today = new Date().toISOString().split('T')[0]
        await supabase.from('transactions').insert({
          user_id: userId, account_id: itemForm.account_id,
          category_id: (itemForm.category_id || null) as string,
          type: 'expense', amount, description: desc, date: today, notes: null,
        })
        toast.success('Gasto registrado y pago asentado en la cuenta')
      } else {
        toast.success(editingItem ? 'Gasto actualizado' : 'Gasto agregado')
      }

      if (editingItem) {
        setLocalItems(prev => prev.map(i => i.id === editingItem.id ? saved as FixedExpenseItem : i))
      } else {
        setLocalItems(prev => [...prev, saved as FixedExpenseItem])
      }
      closeItemDialog()
      router.refresh()
    }
    setItemLoading(false)
  }

  async function handleItemDelete() {
    if (!editingItem) return
    setItemDeleting(true)
    const { error } = await supabase.from('fixed_expense_items').delete().eq('id', editingItem.id)
    if (error) {
      toast.error('Error al eliminar')
    } else {
      toast.success('Gasto eliminado')
      setLocalItems(prev => prev.filter(i => i.id !== editingItem.id))
      closeItemDialog()
      router.refresh()
    }
    setItemDeleting(false)
  }

  async function handleResetGroup(groupId: string) {
    const { error } = await supabase
      .from('fixed_expense_items')
      .update({ status: 'pending' })
      .eq('user_id', userId).eq('group_id', groupId)
    if (error) {
      toast.error('Error al resetear')
    } else {
      toast.success('Reseteado a Pendiente')
      setLocalItems(prev => prev.map(i => i.group_id === groupId ? { ...i, status: 'pending' } : i))
    }
  }

  // ── Group handlers ────────────────────────────────────────────────────────────
  function openCreateGroup() {
    setEditingGroup(null)
    setGroupForm({ name: '', color: '#7C4DFF' })
    setGroupDialogOpen(true)
  }

  function openEditGroup(group: FixedExpenseGroup) {
    setEditingGroup(group)
    setGroupForm({ name: group.name, color: group.color })
    setTimeout(() => setGroupDialogOpen(true), 50)
  }

  function closeGroupDialog() {
    setGroupDialogOpen(false)
    setEditingGroup(null)
    setGroupForm({ name: '', color: '#7C4DFF' })
  }

  async function handleGroupSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!groupForm.name.trim()) return
    setGroupLoading(true)
    const payload = {
      user_id: userId, month, year,
      name: groupForm.name.trim(),
      color: groupForm.color,
      order: editingGroup ? editingGroup.order : localGroups.length,
    }
    const { error, data: saved } = editingGroup
      ? await supabase.from('fixed_expense_groups').update(payload).eq('id', editingGroup.id).select().single()
      : await supabase.from('fixed_expense_groups').insert(payload).select().single()

    if (error) {
      toast.error('Error al guardar')
    } else {
      toast.success(editingGroup ? 'Sección actualizada' : 'Sección creada')
      if (editingGroup) {
        setLocalGroups(prev => prev.map(g => g.id === editingGroup.id ? saved as FixedExpenseGroup : g))
      } else {
        setLocalGroups(prev => [...prev, saved as FixedExpenseGroup])
      }
      closeGroupDialog()
    }
    setGroupLoading(false)
  }

  async function handleGroupDelete(group: FixedExpenseGroup) {
    setGroupDeleting(true)
    await supabase.from('fixed_expense_items').delete().eq('group_id', group.id)
    const { error } = await supabase.from('fixed_expense_groups').delete().eq('id', group.id)
    if (error) {
      toast.error('Error al eliminar la sección')
    } else {
      toast.success('Sección eliminada')
      setLocalGroups(prev => prev.filter(g => g.id !== group.id))
      setLocalItems(prev => prev.filter(i => i.group_id !== group.id))
      router.refresh()
    }
    setGroupDeleting(false)
  }

  return (
    <>
      <div className="space-y-4 max-w-2xl mx-auto mt-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Gastos fijos</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Organizá tus gastos en secciones</p>
          </div>
          <Button
            size="sm"
            onClick={openCreateGroup}
            className="font-semibold"
            style={{ background: 'linear-gradient(135deg, #7C4DFF 0%, #9C6DFF 100%)', color: '#fff', border: 'none' }}
          >
            <Plus className="h-4 w-4 mr-1" /> Nueva sección
          </Button>
        </div>

        {/* Empty state */}
        {localGroups.length === 0 ? (
          <div className="text-center text-muted-foreground py-16 border-2 border-dashed border-border rounded-xl">
            <div
              className="h-12 w-12 rounded-2xl mx-auto mb-3 flex items-center justify-center"
              style={{ backgroundColor: '#7C4DFF15' }}
            >
              <Layers className="h-6 w-6" style={{ color: '#7C4DFF' }} />
            </div>
            <p className="font-medium text-sm">Sin secciones</p>
            <p className="text-xs mt-1 mb-4">Creá una sección para organizar tus gastos fijos</p>
            <div className="flex flex-col items-center gap-2">
              <Button
                size="sm" onClick={openCreateGroup}
                style={{ background: 'linear-gradient(135deg, #7C4DFF 0%, #9C6DFF 100%)', color: '#fff', border: 'none' }}
              >
                <Plus className="h-4 w-4 mr-1" /> Nueva sección
              </Button>
              <button
                onClick={openImportDialog}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors mt-1"
              >
                <Download className="h-3.5 w-3.5" />
                Copiar del mes anterior
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {localGroups.map(group => {
              const rawGroupItems = localItems.filter(i => i.group_id === group.id)
              const sortState = sortByStatus[group.id] ?? 0
              const groupItems = sortState === 0
                ? rawGroupItems
                : [...rawGroupItems].sort((a, b) =>
                    (STATUS_SORT_ORDER[sortState as 1|2|3][a.status] ?? 0) -
                    (STATUS_SORT_ORDER[sortState as 1|2|3][b.status] ?? 0)
                  )
              const paid    = groupItems.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)
              const pending = groupItems.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0)
              const na      = groupItems.filter(i => i.status === 'not_applicable').reduce((s, i) => s + i.amount, 0)
              const total   = groupItems.reduce((s, i) => s + i.amount, 0)
              const collapsed = collapsedGroups.has(group.id)

              return (
                <div
                  key={group.id}
                  className="bg-card rounded-xl border border-border overflow-hidden shadow-sm"
                  style={{ borderLeft: `3px solid ${group.color}` }}
                >
                  {/* Group header — click left side to collapse */}
                  <div
                    className="flex items-center justify-between px-4 py-3"
                    style={{
                      background: `linear-gradient(90deg, ${group.color}12 0%, transparent 60%)`,
                      borderBottom: collapsed ? 'none' : undefined,
                    }}
                  >
                    <div
                      className="flex items-center gap-2.5 flex-1 cursor-pointer select-none min-w-0 mr-2"
                      onClick={() => toggleCollapse(group.id)}
                    >
                      <ChevronDown
                        className="h-3.5 w-3.5 text-muted-foreground/60 transition-transform duration-200 flex-shrink-0"
                        style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                      />
                      <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: group.color }} />
                      <span className="font-bold text-sm text-foreground">{group.name}</span>
                      <span className="text-[10px] font-semibold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-full">
                        {groupItems.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      {total > 0 && (
                        <span className="text-xs font-bold tabular-nums" style={{ color: group.color }}>
                          {formatCurrency(total)}
                        </span>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-muted/60 transition-colors">
                          <MoreVertical className="h-3.5 w-3.5" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditGroup(group)}>Editar sección</DropdownMenuItem>
                          {groupItems.length > 0 && (
                            <DropdownMenuItem onClick={() => handleResetGroup(group.id)}>
                              Resetear a pendiente
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-500"
                            onClick={() => handleGroupDelete(group)}
                          >
                            Eliminar sección
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Column headers */}
                  {!collapsed && groupItems.length > 0 && (
                    <div className="grid grid-cols-[1fr_112px_84px] gap-x-2 bg-muted/30 border-b border-border/50 px-4 py-2">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Categoría</span>
                      <button
                        type="button"
                        onClick={() => cycleSortStatus(group.id)}
                        className="flex items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-widest transition-colors hover:text-foreground"
                        style={{ color: sortState === 1 ? '#00CB96' : sortState === 2 ? '#FF4D6D' : sortState === 3 ? '#F59E0B' : undefined }}
                      >
                        Estado
                        {sortState === 0
                          ? <ArrowUpDown className="h-2.5 w-2.5 text-muted-foreground/50" />
                          : <div className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: sortState === 1 ? '#00CB96' : sortState === 2 ? '#FF4D6D' : '#F59E0B' }} />
                        }
                      </button>
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-right">Monto</span>
                    </div>
                  )}

                  {/* Items + footer — ocultos cuando está colapsado */}
                  {!collapsed && (
                    <>
                      {groupItems.length === 0 ? (
                        <div className="px-4 py-5 text-center border-t border-border/50">
                          <p className="text-xs text-muted-foreground">Sin gastos en esta sección</p>
                        </div>
                      ) : (
                        <>
                          {groupItems.map(item => {
                            const cat = fixedCategories.find(c => c.id === item.category_id)
                                      ?? (item.category as Category | undefined)
                            const color = statusColor(item.status as FixedExpenseStatus)
                            return (
                              <div
                                key={item.id}
                                onClick={() => openEditItem(item)}
                                className="grid grid-cols-[1fr_112px_84px] gap-x-2 items-center px-4 py-2.5 border-b border-border/40 hover:bg-muted/30 transition-colors cursor-pointer last:border-b-0"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-foreground truncate">
                                    {item.description || (cat ? cat.name : 'Sin descripción')}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {cat && item.description && (
                                      <span className="text-[11px] text-muted-foreground truncate">
                                        <span className="mr-0.5">{cat.icon}</span>{cat.name}
                                      </span>
                                    )}
                                    {item.due_day && (
                                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground shrink-0">
                                        <CalendarDays className="h-2.5 w-2.5" />
                                        día {item.due_day}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex justify-center">
                                  <span
                                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                                    style={{ color, backgroundColor: color + '20', border: `1px solid ${color}40` }}
                                  >
                                    {statusLabel(item.status as FixedExpenseStatus)}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <span className="text-sm font-semibold text-foreground tabular-nums">
                                    {formatCurrency(item.amount)}
                                  </span>
                                </div>
                              </div>
                            )
                          })}

                          {/* Group totals */}
                          <div className="divide-y divide-border/30 bg-muted/20">
                            {paid > 0 && (
                              <div className="grid grid-cols-[1fr_112px_84px] gap-x-2 items-center px-4 py-1.5">
                                <span className="text-[11px] font-semibold" style={{ color: '#00CB96' }}>Pagado</span>
                                <span />
                                <span className="text-right text-[11px] font-bold tabular-nums" style={{ color: '#00CB96' }}>
                                  {formatCurrency(paid)}
                                </span>
                              </div>
                            )}
                            {pending > 0 && (
                              <div className="grid grid-cols-[1fr_112px_84px] gap-x-2 items-center px-4 py-1.5">
                                <span className="text-[11px] font-semibold" style={{ color: '#FF4D6D' }}>Pendiente</span>
                                <span />
                                <span className="text-right text-[11px] font-bold tabular-nums" style={{ color: '#FF4D6D' }}>
                                  {formatCurrency(pending)}
                                </span>
                              </div>
                            )}
                            {na > 0 && (
                              <div className="grid grid-cols-[1fr_112px_84px] gap-x-2 items-center px-4 py-1.5">
                                <span className="text-[11px] font-semibold" style={{ color: '#F59E0B' }}>No corresponde</span>
                                <span />
                                <span className="text-right text-[11px] font-bold tabular-nums" style={{ color: '#F59E0B' }}>
                                  {formatCurrency(na)}
                                </span>
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {/* Add item */}
                      <div
                        className="px-4 py-2.5 border-t border-border/30"
                        style={{ borderTopColor: group.color + '30' }}
                      >
                        <button
                          onClick={() => openCreateItem(group.id)}
                          className="flex items-center gap-1.5 text-xs font-semibold transition-opacity hover:opacity-70"
                          style={{ color: group.color }}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Agregar gasto
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )
            })}

            {/* Import button — shown below groups */}
            <div className="flex justify-center pt-1">
              <button
                onClick={openImportDialog}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                <Download className="h-3.5 w-3.5" />
                Copiar del mes anterior
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Item Dialog ─────────────────────────────────────────────────────────── */}
      <Dialog open={itemDialogOpen} onOpenChange={closeItemDialog}>
        <DialogContent className="sm:max-w-sm max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 border-border">
          {/* Header */}
          <div
            className="px-5 pt-5 pb-4 border-b border-border flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #FF4D6D18 0%, transparent 100%)' }}
          >
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FF4D6D18' }}>
                <TrendingDown className="h-4 w-4" style={{ color: '#FF4D6D' }} />
              </div>
              <DialogTitle className="text-base font-semibold text-foreground">
                {editingItem ? 'Editar gasto fijo' : 'Nuevo gasto fijo'}
              </DialogTitle>
            </div>
          </div>

          <form onSubmit={handleItemSubmit} className="overflow-y-auto flex-1 p-5 space-y-5">

            {/* Monto prominente */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Monto</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground/60">$</span>
                <Input
                  type="number" min="0" step="0.01" placeholder="0.00"
                  value={itemForm.amount}
                  onChange={e => setItemForm({ ...itemForm, amount: e.target.value })}
                  required
                  className="pl-8 h-14 text-2xl font-bold bg-muted/40 border-border/60 tracking-tight"
                  style={{ color: '#FF4D6D' }}
                />
              </div>
            </div>

            {/* Categoría — chips igual que TransactionDialog */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Categoría</label>
              {fixedCategories.length === 0 ? (
                <p className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 p-2.5 rounded-lg">
                  No hay categorías de tipo "Gasto fijo". Creá una en Ajustes → Categorías.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-0.5">
                  {fixedCategories.map(c => {
                    const active = itemForm.category_id === c.id
                    const color  = c.color || '#7C4DFF'
                    return (
                      <button
                        key={c.id} type="button"
                        onClick={() => setItemForm({ ...itemForm, category_id: c.id })}
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

            {/* Descripción */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                Descripción <span className="normal-case font-normal text-muted-foreground/60">(opcional)</span>
              </label>
              <Input
                placeholder="Ej: Gas, Internet, Alquiler..."
                value={itemForm.description}
                onChange={e => setItemForm({ ...itemForm, description: e.target.value })}
                className="bg-muted/40 border-border/60"
              />
            </div>

            {/* Vencimiento */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                Vence día <span className="normal-case font-normal text-muted-foreground/60">(opcional)</span>
              </label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="number" min="1" max="31" placeholder="15"
                  value={itemForm.due_day}
                  onChange={e => setItemForm({ ...itemForm, due_day: e.target.value })}
                  className="pl-8 bg-muted/40 border-border/60"
                />
              </div>
            </div>

            {/* Estado */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Estado</label>
              <div className="flex flex-col gap-1.5">
                {STATUS_OPTS.map(opt => {
                  const active = itemForm.status === opt.value
                  return (
                    <button
                      key={opt.value} type="button"
                      onClick={() => setItemForm({ ...itemForm, status: opt.value })}
                      className="flex items-center gap-2.5 py-2.5 px-3 rounded-xl text-sm font-medium border transition-all text-left"
                      style={active
                        ? { backgroundColor: opt.bg, borderColor: opt.border, color: opt.color }
                        : { backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }
                      }
                    >
                      <div
                        className="h-2 w-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: active ? opt.color : 'hsl(var(--border))' }}
                      />
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Cuenta de pago — solo cuando status = paid */}
            {itemForm.status === 'paid' && accounts.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Cuenta de pago <span className="normal-case font-normal text-muted-foreground/60">(opcional — genera gasto)</span>
                </label>
                <div className="space-y-1.5">
                  {accounts.map(a => {
                    const active = itemForm.account_id === a.id
                    return (
                      <button
                        key={a.id} type="button"
                        onClick={() => setItemForm({ ...itemForm, account_id: active ? '' : a.id })}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm transition-all text-left"
                        style={active
                          ? { backgroundColor: a.color + '18', borderColor: a.color + '55' }
                          : { backgroundColor: 'transparent', borderColor: 'hsl(var(--border))' }
                        }
                      >
                        <div className="w-1 h-7 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground truncate text-sm">{a.name}</p>
                          <p className="text-[11px] text-muted-foreground tabular-nums">{formatCurrency(a.balance, a.currency)}</p>
                        </div>
                        {active && <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Encargado */}
            {responsibles.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Encargado <span className="normal-case font-normal text-muted-foreground/60">(opcional)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setItemForm({ ...itemForm, responsible: '' })}
                    className="py-1.5 px-3 rounded-full text-xs font-medium border transition-all"
                    style={itemForm.responsible === ''
                      ? { backgroundColor: '#7C4DFF20', borderColor: '#7C4DFF40', color: '#7C4DFF' }
                      : { backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }
                    }
                  >
                    Sin encargado
                  </button>
                  {responsibles.map(r => (
                    <button
                      key={r.id} type="button"
                      onClick={() => setItemForm({ ...itemForm, responsible: r.name })}
                      className="flex items-center gap-1.5 py-1.5 px-3 rounded-full text-xs font-medium border transition-all"
                      style={itemForm.responsible === r.name
                        ? { backgroundColor: r.color + '20', borderColor: r.color + '60', color: r.color }
                        : { backgroundColor: 'transparent', borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }
                      }
                    >
                      <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
                      {r.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={closeItemDialog}>
                Cancelar
              </Button>
              <Button
                type="submit" disabled={itemLoading}
                className="flex-1 font-semibold"
                style={{ background: 'linear-gradient(135deg, #FF4D6D 0%, #FF7D94 100%)', color: '#fff', border: 'none' }}
              >
                {itemLoading ? 'Guardando...' : editingItem ? 'Guardar' : 'Agregar'}
              </Button>
            </div>

            {editingItem && (
              <Button
                type="button" variant="destructive" className="w-full"
                disabled={itemDeleting}
                onClick={handleItemDelete}
              >
                {itemDeleting ? 'Eliminando...' : 'Eliminar gasto fijo'}
              </Button>
            )}
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Group Dialog ─────────────────────────────────────────────────────────── */}
      <Dialog open={groupDialogOpen} onOpenChange={closeGroupDialog}>
        <DialogContent className="sm:max-w-xs overflow-hidden flex flex-col p-0 gap-0 border-border">
          <div
            className="px-5 pt-5 pb-4 border-b border-border flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${groupForm.color}18 0%, transparent 100%)` }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="h-8 w-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: groupForm.color + '20' }}
              >
                <Layers className="h-4 w-4" style={{ color: groupForm.color }} />
              </div>
              <DialogTitle className="text-base font-semibold text-foreground">
                {editingGroup ? 'Editar sección' : 'Nueva sección'}
              </DialogTitle>
            </div>
          </div>

          <form onSubmit={handleGroupSubmit} className="p-5 space-y-5">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Nombre</label>
              <Input
                placeholder="Ej: Familia, Personal, Casa..."
                value={groupForm.name}
                onChange={e => setGroupForm({ ...groupForm, name: e.target.value })}
                required
                autoFocus
                className="bg-muted/40 border-border/60"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Color</label>
              <div className="flex gap-2 flex-wrap">
                {GROUP_COLORS.map(c => (
                  <button
                    key={c} type="button"
                    onClick={() => setGroupForm({ ...groupForm, color: c })}
                    className="h-8 w-8 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c,
                      boxShadow: groupForm.color === c
                        ? `0 0 0 2px hsl(var(--background)), 0 0 0 4px ${c}`
                        : 'none',
                    }}
                  >
                    {groupForm.color === c && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={closeGroupDialog}>
                Cancelar
              </Button>
              <Button
                type="submit" disabled={groupLoading}
                className="flex-1 font-semibold"
                style={{ background: 'linear-gradient(135deg, #7C4DFF 0%, #9C6DFF 100%)', color: '#fff', border: 'none' }}
              >
                {groupLoading ? 'Guardando...' : editingGroup ? 'Guardar' : 'Crear'}
              </Button>
            </div>

            {editingGroup && (
              <Button
                type="button" variant="destructive" className="w-full"
                disabled={groupDeleting}
                onClick={async () => {
                  closeGroupDialog()
                  await handleGroupDelete(editingGroup)
                }}
              >
                {groupDeleting ? 'Eliminando...' : 'Eliminar sección'}
              </Button>
            )}
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Import Dialog ────────────────────────────────────────────────────────── */}
      <Dialog open={importDialogOpen} onOpenChange={open => { if (!open) closeImportDialog() }}>
        <DialogContent className="sm:max-w-sm max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 border-border">
          {/* Header */}
          <div
            className="px-5 pt-5 pb-4 border-b border-border flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #7C4DFF18 0%, transparent 100%)' }}
          >
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#7C4DFF18' }}>
                <Download className="h-4 w-4" style={{ color: '#7C4DFF' }} />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-foreground">Copiar secciones</DialogTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {MONTH_NAMES[prevMonthNum - 1]} {prevYearNum} → monto en $0, estado pendiente
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-y-auto flex-1 p-5 space-y-3">
            {loadingPrev ? (
              <div className="py-8 text-center">
                <p className="text-sm text-muted-foreground">Cargando secciones...</p>
              </div>
            ) : prevGroupsData.length === 0 ? (
              <div className="py-8 text-center space-y-1">
                <p className="text-sm font-medium text-foreground">Sin secciones</p>
                <p className="text-xs text-muted-foreground">
                  No hay secciones en {MONTH_NAMES[prevMonthNum - 1]} {prevYearNum}
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">{selectedImportIds.size} de {prevGroupsData.length} seleccionadas</p>
                  <button
                    type="button"
                    className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => {
                      if (selectedImportIds.size === prevGroupsData.length) {
                        setSelectedImportIds(new Set())
                      } else {
                        setSelectedImportIds(new Set(prevGroupsData.map(g => g.id)))
                      }
                    }}
                  >
                    {selectedImportIds.size === prevGroupsData.length ? 'Desmarcar todas' : 'Seleccionar todas'}
                  </button>
                </div>
                {prevGroupsData.map(g => {
                  const selected = selectedImportIds.has(g.id)
                  return (
                    <button
                      key={g.id} type="button"
                      onClick={() => toggleImportSelection(g.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left"
                      style={selected
                        ? { backgroundColor: g.color + '15', borderColor: g.color + '50' }
                        : { backgroundColor: 'transparent', borderColor: 'hsl(var(--border))' }
                      }
                    >
                      <div
                        className="h-5 w-5 rounded-md flex items-center justify-center flex-shrink-0 border-2 transition-colors"
                        style={selected
                          ? { backgroundColor: g.color, borderColor: g.color }
                          : { backgroundColor: 'transparent', borderColor: 'hsl(var(--border))' }
                        }
                      >
                        {selected && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                      </div>
                      <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: g.color }} />
                      <span className="flex-1 text-sm font-semibold text-foreground">{g.name}</span>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                        style={{ backgroundColor: g.color + '15', color: g.color }}
                      >
                        {g.itemCount} gasto{g.itemCount !== 1 ? 's' : ''}
                      </span>
                    </button>
                  )
                })}
              </>
            )}
          </div>

          {!loadingPrev && prevGroupsData.length > 0 && (
            <div className="px-5 pb-5 pt-3 border-t border-border flex-shrink-0 flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={closeImportDialog} disabled={importing}>
                Cancelar
              </Button>
              <Button
                type="button" disabled={importing || selectedImportIds.size === 0}
                className="flex-1 font-semibold"
                style={{ background: 'linear-gradient(135deg, #7C4DFF 0%, #9C6DFF 100%)', color: '#fff', border: 'none' }}
                onClick={handleImport}
              >
                {importing ? 'Importando...' : `Importar ${selectedImportIds.size > 0 ? selectedImportIds.size : ''}`}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
