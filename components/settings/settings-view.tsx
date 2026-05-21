'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { LogOut, User, Mail, Shield, Plus, MoreVertical } from 'lucide-react'
import { toast } from 'sonner'
import { NotificationsToggle } from './notifications-toggle'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { Category, ExpenseType, Responsible } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  user: SupabaseUser
  categories: Category[]
  expenseTypes: ExpenseType[]
  responsibles: Responsible[]
}

const COMMON_ICONS = ['🏠','🍔','🚗','💊','🎬','👕','✈️','📚','💡','🐾','🎮','💰','💼','🎁','🏋️','🛒','☕','🍕','🎵','💅']
const ET_COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#6366f1','#8b5cf6','#ec4899','#14b8a6','#6b7280']

type CategoryForm = { name: string; icon: string; type: 'income' | 'expense'; expense_type_id: string }
type ExpenseTypeForm = { name: string; color: string }
type ResponsibleForm = { name: string; color: string }

export function SettingsView({ user, categories: initialCategories, expenseTypes: initialExpenseTypes, responsibles: initialResponsibles }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const name = user.user_metadata?.full_name ?? user.email ?? 'Usuario'
  const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>(initialExpenseTypes)
  const [responsibles, setResponsibles] = useState<Responsible[]>(initialResponsibles)

  // Category dialog
  const [catDialogOpen, setCatDialogOpen] = useState(false)
  const [editingCat, setEditingCat] = useState<Category | null>(null)
  const [catForm, setCatForm] = useState<CategoryForm>({ name: '', icon: '🏷️', type: 'expense', expense_type_id: '' })
  const [catLoading, setCatLoading] = useState(false)

  // Expense type dialog
  const [etDialogOpen, setEtDialogOpen] = useState(false)
  const [editingEt, setEditingEt] = useState<ExpenseType | null>(null)
  const [etForm, setEtForm] = useState<ExpenseTypeForm>({ name: '', color: ET_COLORS[4] })
  const [etLoading, setEtLoading] = useState(false)

  // Responsible dialog
  const [respDialogOpen, setRespDialogOpen] = useState(false)
  const [editingResp, setEditingResp] = useState<Responsible | null>(null)
  const [respForm, setRespForm] = useState<ResponsibleForm>({ name: '', color: ET_COLORS[4] })
  const [respLoading, setRespLoading] = useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
    toast.success('Sesión cerrada')
    router.push('/auth/login')
    router.refresh()
  }

  // --- Categorías ---
  function openCreateCat() {
    setEditingCat(null)
    setCatForm({ name: '', icon: '🏷️', type: 'expense', expense_type_id: '' })
    setCatDialogOpen(true)
  }

  function openEditCat(c: Category) {
    setEditingCat(c)
    setCatForm({ name: c.name, icon: c.icon, type: c.type, expense_type_id: c.expense_type_id ?? '' })
    setTimeout(() => setCatDialogOpen(true), 0)
  }

  async function handleSaveCat(e: React.FormEvent) {
    e.preventDefault()
    if (!catForm.name.trim()) return
    setCatLoading(true)

    const payload = {
      name: catForm.name.trim(),
      icon: catForm.icon,
      type: catForm.type,
      expense_type_id: catForm.type === 'expense' && catForm.expense_type_id ? catForm.expense_type_id : null,
    }

    if (editingCat) {
      const { error, data: updated } = await supabase.from('categories').update(payload).eq('id', editingCat.id).select()
      if (error) { toast.error(`Error al guardar: ${error.message}`) }
      else if (!updated || updated.length === 0) { toast.error('No se pudo guardar (sin permisos)') }
      else {
        toast.success('Categoría actualizada')
        const et = expenseTypes.find(e => e.id === payload.expense_type_id) ?? null
        setCategories(prev => prev.map(c => c.id === editingCat.id
          ? { ...c, ...payload, expense_type: et ?? undefined }
          : c))
        setCatDialogOpen(false)
      }
    } else {
      const { data, error } = await supabase.from('categories')
        .insert({ user_id: user.id, color: '#6b7280', is_default: false, ...payload })
        .select('*, expense_type:expense_types(id,name,is_default)')
        .single()
      if (error) { toast.error(`Error al crear categoría: ${error.message}`) }
      else { toast.success('Categoría creada'); setCategories(prev => [...prev, data]); setCatDialogOpen(false) }
    }
    setCatLoading(false)
  }

  async function handleDeleteCat(id: string) {
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) toast.error('No se puede eliminar (tiene transacciones asociadas)')
    else { toast.success('Categoría eliminada'); setCategories(prev => prev.filter(c => c.id !== id)) }
  }

  // --- Tipos de gasto ---
  function openCreateEt() {
    setEditingEt(null)
    setEtForm({ name: '', color: ET_COLORS[4] })
    setEtDialogOpen(true)
  }

  function openEditEt(et: ExpenseType) {
    setEditingEt(et)
    setEtForm({ name: et.name, color: et.color ?? ET_COLORS[4] })
    setTimeout(() => setEtDialogOpen(true), 0)
  }

  async function handleSaveEt(e: React.FormEvent) {
    e.preventDefault()
    if (!etForm.name.trim()) return
    setEtLoading(true)

    if (editingEt) {
      const { error } = await supabase.from('expense_types').update({ name: etForm.name.trim(), color: etForm.color }).eq('id', editingEt.id)
      if (error) { toast.error('Error al guardar') }
      else {
        toast.success('Tipo actualizado')
        setExpenseTypes(prev => prev.map(e => e.id === editingEt.id ? { ...e, name: etForm.name.trim(), color: etForm.color } : e))
        setEtDialogOpen(false)
      }
    } else {
      const { data, error } = await supabase.from('expense_types')
        .insert({ user_id: user.id, name: etForm.name.trim(), color: etForm.color, is_default: false })
        .select().single()
      if (error) { toast.error('Error al crear tipo') }
      else { toast.success('Tipo creado'); setExpenseTypes(prev => [...prev, data]); setEtDialogOpen(false) }
    }
    setEtLoading(false)
  }

  async function handleDeleteEt(id: string) {
    const { error } = await supabase.from('expense_types').delete().eq('id', id)
    if (error) toast.error('No se puede eliminar')
    else { toast.success('Tipo eliminado'); setExpenseTypes(prev => prev.filter(e => e.id !== id)) }
  }

  // --- Encargados ---
  function openCreateResp() {
    setEditingResp(null)
    setRespForm({ name: '', color: ET_COLORS[4] })
    setRespDialogOpen(true)
  }

  function openEditResp(r: Responsible) {
    setEditingResp(r)
    setRespForm({ name: r.name, color: r.color })
    setTimeout(() => setRespDialogOpen(true), 0)
  }

  async function handleSaveResp(e: React.FormEvent) {
    e.preventDefault()
    if (!respForm.name.trim()) return
    setRespLoading(true)

    if (editingResp) {
      const { error } = await supabase.from('responsible_parties').update({ name: respForm.name.trim(), color: respForm.color }).eq('id', editingResp.id)
      if (error) { toast.error('Error al guardar') }
      else {
        toast.success('Encargado actualizado')
        setResponsibles(prev => prev.map(r => r.id === editingResp.id ? { ...r, name: respForm.name.trim(), color: respForm.color } : r))
        setRespDialogOpen(false)
      }
    } else {
      const { data, error } = await supabase.from('responsible_parties')
        .insert({ user_id: user.id, name: respForm.name.trim(), color: respForm.color })
        .select().single()
      if (error) { toast.error('Error al crear encargado') }
      else { toast.success('Encargado creado'); setResponsibles(prev => [...prev, data]); setRespDialogOpen(false) }
    }
    setRespLoading(false)
  }

  async function handleDeleteResp(id: string) {
    const { error } = await supabase.from('responsible_parties').delete().eq('id', id)
    if (error) toast.error('No se puede eliminar')
    else { toast.success('Encargado eliminado'); setResponsibles(prev => prev.filter(r => r.id !== id)) }
  }

  const expenses = categories.filter(c => c.type === 'expense')
  const incomes = categories.filter(c => c.type === 'income')

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Ajustes</h1>

      {/* Notificaciones */}
      <Card>
        <CardHeader><CardTitle className="text-base">Notificaciones</CardTitle></CardHeader>
        <CardContent>
          <NotificationsToggle />
        </CardContent>
      </Card>

      {/* Mi cuenta */}
      <Card>
        <CardHeader><CardTitle className="text-base">Mi cuenta</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="bg-emerald-600 text-white text-lg font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-foreground">{name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <Separator />
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 text-muted-foreground"><Mail className="h-4 w-4 text-muted-foreground/60" /><span>{user.email}</span></div>
            <div className="flex items-center gap-3 text-muted-foreground"><Shield className="h-4 w-4 text-muted-foreground/60" /><span>Email {user.email_confirmed_at ? 'verificado' : 'sin verificar'}</span></div>
            <div className="flex items-center gap-3 text-muted-foreground"><User className="h-4 w-4 text-muted-foreground/60" /><span>Cuenta creada el {new Date(user.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Tipos de gasto */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Tipos de gasto</CardTitle>
          <Button size="sm" onClick={openCreateEt} className="bg-emerald-600 hover:bg-emerald-700 h-8">
            <Plus className="h-4 w-4 mr-1" /> Nuevo
          </Button>
        </CardHeader>
        <CardContent className="space-y-0.5">
          {expenseTypes.map(et => (
            <div key={et.id} onClick={() => openEditEt(et)} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/50 cursor-pointer">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: et.color ?? '#6b7280' }} />
                <span className="text-sm text-foreground truncate">{et.name}</span>
              </div>
              <div onClick={e => e.stopPropagation()} className="flex-shrink-0 ml-2">
                <DropdownMenu>
                  <DropdownMenuTrigger className="p-1.5 rounded text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-colors">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditEt(et)}>Editar</DropdownMenuItem>
                    {!et.is_default && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-400" onClick={() => handleDeleteEt(et.id)}>Eliminar</DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Encargados */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Encargados</CardTitle>
          <Button size="sm" onClick={openCreateResp} className="bg-emerald-600 hover:bg-emerald-700 h-8">
            <Plus className="h-4 w-4 mr-1" /> Nuevo
          </Button>
        </CardHeader>
        <CardContent className="space-y-0.5">
          {responsibles.length === 0 && (
            <p className="text-sm text-muted-foreground py-2 px-2">Sin encargados creados</p>
          )}
          {responsibles.map(r => (
            <div key={r.id} onClick={() => openEditResp(r)} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/50 cursor-pointer">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: r.color }} />
                <span className="text-sm text-foreground truncate">{r.name}</span>
              </div>
              <div onClick={e => e.stopPropagation()} className="flex-shrink-0 ml-2">
                <DropdownMenu>
                  <DropdownMenuTrigger className="p-1.5 rounded text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-colors">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditResp(r)}>Editar</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-400" onClick={() => handleDeleteResp(r.id)}>Eliminar</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Categorías */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Categorías</CardTitle>
          <Button size="sm" onClick={openCreateCat} className="bg-emerald-600 hover:bg-emerald-700 h-8">
            <Plus className="h-4 w-4 mr-1" /> Nueva
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Gastos */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Gastos</p>
            <div className="space-y-0.5">
              {expenses.map(c => (
                <div key={c.id} onClick={() => openEditCat(c)} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base flex-shrink-0">{c.icon}</span>
                    <div className="min-w-0">
                      <span className="text-sm text-foreground">{c.name}</span>
                      {c.expense_type && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: `${c.expense_type.color ?? '#3b82f6'}20`, color: c.expense_type.color ?? '#3b82f6' }}>
                          {c.expense_type.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div onClick={e => e.stopPropagation()} className="flex-shrink-0 ml-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="p-1.5 rounded text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-colors">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditCat(c)}>Editar</DropdownMenuItem>
                        {!c.is_default && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-400" onClick={() => handleDeleteCat(c.id)}>Eliminar</DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Separator />
          {/* Ingresos */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Ingresos</p>
            <div className="space-y-0.5">
              {incomes.map(c => (
                <div key={c.id} onClick={() => openEditCat(c)} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base flex-shrink-0">{c.icon}</span>
                    <span className="text-sm text-foreground truncate">{c.name}</span>
                  </div>
                  <div onClick={e => e.stopPropagation()} className="flex-shrink-0 ml-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="p-1.5 rounded text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-colors">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditCat(c)}>Editar</DropdownMenuItem>
                        {!c.is_default && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-400" onClick={() => handleDeleteCat(c.id)}>Eliminar</DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cerrar sesión */}
      <Card>
        <CardContent className="pt-6">
          <Button variant="destructive" className="w-full" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" /> Cerrar sesión
          </Button>
        </CardContent>
      </Card>

      {/* Dialog categoría */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{editingCat ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveCat} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <div className="flex gap-2">
                {(['expense', 'income'] as const).map(t => (
                  <button key={t} type="button" onClick={() => setCatForm({ ...catForm, type: t, expense_type_id: '' })}
                    className={cn('flex-1 py-2 rounded-lg text-sm font-medium border transition-colors',
                      catForm.type === t
                        ? t === 'expense' ? 'bg-red-500 text-white border-red-500' : 'bg-emerald-600 text-white border-emerald-600'
                        : 'border-border text-muted-foreground hover:border-border/60')}>
                    {t === 'expense' ? 'Gasto' : 'Ingreso'}
                  </button>
                ))}
              </div>
            </div>

            {/* Tipo de gasto (solo para expenses) */}
            {catForm.type === 'expense' && (
              <div className="space-y-2">
                <Label>Tipo de gasto</Label>
                <div className="flex flex-col gap-1.5">
                  <button type="button" onClick={() => setCatForm(f => ({ ...f, expense_type_id: '' }))}
                    className={cn('py-2 px-3 rounded-lg text-sm font-medium border transition-colors text-left',
                      catForm.expense_type_id === '' ? 'border-primary bg-primary/20 text-foreground' : 'border-border text-muted-foreground hover:border-border/60')}>
                    Sin clasificar
                  </button>
                  {expenseTypes.map(et => (
                    <button key={et.id} type="button" onClick={() => setCatForm(f => ({ ...f, expense_type_id: et.id }))}
                      className={cn('py-2 px-3 rounded-lg text-sm font-medium border transition-colors text-left flex items-center gap-2',
                        catForm.expense_type_id === et.id ? 'border-primary bg-primary/20 text-foreground' : 'border-border text-muted-foreground hover:border-border/60')}>
                      <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: et.color }} />
                      {et.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input placeholder="Ej: Gimnasio, Freelance..." value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} required />
            </div>

            <div className="space-y-2">
              <Label>Ícono</Label>
              <div className="grid grid-cols-10 gap-1">
                {COMMON_ICONS.map(icon => (
                  <button key={icon} type="button" onClick={() => setCatForm({ ...catForm, icon })}
                    className={cn('h-8 w-8 rounded-lg text-base flex items-center justify-center transition-colors',
                      catForm.icon === icon ? 'bg-emerald-950/50 ring-2 ring-emerald-500' : 'hover:bg-muted')}>
                    {icon}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-muted-foreground">O escribí uno:</span>
                <Input className="w-16 text-center" maxLength={2} value={catForm.icon} onChange={e => setCatForm({ ...catForm, icon: e.target.value })} />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setCatDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={catLoading} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                {catLoading ? 'Guardando...' : editingCat ? 'Guardar cambios' : 'Crear'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog encargado */}
      <Dialog open={respDialogOpen} onOpenChange={setRespDialogOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>{editingResp ? 'Editar encargado' : 'Nuevo encargado'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveResp} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input placeholder="Ej: Lucio, María, Compartido..." value={respForm.name} onChange={e => setRespForm({ ...respForm, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {ET_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setRespForm({ ...respForm, color: c })}
                    className={cn('h-7 w-7 rounded-full border-2 transition-transform', respForm.color === c ? 'border-foreground scale-110' : 'border-transparent hover:scale-105')}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <div className="flex items-center gap-1.5 ml-1">
                  <div className="h-7 w-7 rounded-full border border-border flex-shrink-0" style={{ backgroundColor: respForm.color }} />
                  <input type="color" value={respForm.color} onChange={e => setRespForm({ ...respForm, color: e.target.value })}
                    className="h-7 w-10 rounded cursor-pointer border border-border p-0.5 bg-muted" title="Color personalizado" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setRespDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={respLoading} className="flex-1 text-white" style={{ backgroundColor: respForm.color }}>
                {respLoading ? 'Guardando...' : editingResp ? 'Guardar' : 'Crear'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog tipo de gasto */}
      <Dialog open={etDialogOpen} onOpenChange={setEtDialogOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>{editingEt ? 'Editar tipo de gasto' : 'Nuevo tipo de gasto'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveEt} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input placeholder="Ej: Gasto discrecional, Inversión..." value={etForm.name} onChange={e => setEtForm({ ...etForm, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex items-center gap-2 flex-wrap">
                {ET_COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setEtForm({ ...etForm, color: c })}
                    className={cn('h-7 w-7 rounded-full border-2 transition-transform', etForm.color === c ? 'border-foreground scale-110' : 'border-transparent hover:scale-105')}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <div className="flex items-center gap-1.5 ml-1">
                  <div className="h-7 w-7 rounded-full border border-border flex-shrink-0" style={{ backgroundColor: etForm.color }} />
                  <input type="color" value={etForm.color} onChange={e => setEtForm({ ...etForm, color: e.target.value })}
                    className="h-7 w-10 rounded cursor-pointer border border-border p-0.5 bg-muted" title="Color personalizado" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setEtDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={etLoading} className="flex-1 text-white" style={{ backgroundColor: etForm.color }}>
                {etLoading ? 'Guardando...' : editingEt ? 'Guardar' : 'Crear'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
