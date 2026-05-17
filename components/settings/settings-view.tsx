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
import { LogOut, User, Mail, Shield, Plus, Trash2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { Category, ExpenseType } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  user: SupabaseUser
  categories: Category[]
  expenseTypes: ExpenseType[]
}

const COMMON_ICONS = ['🏠','🍔','🚗','💊','🎬','👕','✈️','📚','💡','🐾','🎮','💰','💼','🎁','🏋️','🛒','☕','🍕','🎵','💅']

type CategoryForm = { name: string; icon: string; type: 'income' | 'expense'; expense_type_id: string }
type ExpenseTypeForm = { name: string }

export function SettingsView({ user, categories: initialCategories, expenseTypes: initialExpenseTypes }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const name = user.user_metadata?.full_name ?? user.email ?? 'Usuario'
  const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>(initialExpenseTypes)

  // Category dialog
  const [catDialogOpen, setCatDialogOpen] = useState(false)
  const [editingCat, setEditingCat] = useState<Category | null>(null)
  const [catForm, setCatForm] = useState<CategoryForm>({ name: '', icon: '🏷️', type: 'expense', expense_type_id: '' })
  const [catLoading, setCatLoading] = useState(false)

  // Expense type dialog
  const [etDialogOpen, setEtDialogOpen] = useState(false)
  const [editingEt, setEditingEt] = useState<ExpenseType | null>(null)
  const [etForm, setEtForm] = useState<ExpenseTypeForm>({ name: '' })
  const [etLoading, setEtLoading] = useState(false)

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
    setCatDialogOpen(true)
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
      const { error } = await supabase.from('categories').update(payload).eq('id', editingCat.id)
      if (error) { toast.error('Error al guardar') }
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
      if (error) { toast.error('Error al crear categoría') }
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
    setEtForm({ name: '' })
    setEtDialogOpen(true)
  }

  function openEditEt(et: ExpenseType) {
    setEditingEt(et)
    setEtForm({ name: et.name })
    setEtDialogOpen(true)
  }

  async function handleSaveEt(e: React.FormEvent) {
    e.preventDefault()
    if (!etForm.name.trim()) return
    setEtLoading(true)

    if (editingEt) {
      const { error } = await supabase.from('expense_types').update({ name: etForm.name.trim() }).eq('id', editingEt.id)
      if (error) { toast.error('Error al guardar') }
      else {
        toast.success('Tipo actualizado')
        setExpenseTypes(prev => prev.map(e => e.id === editingEt.id ? { ...e, name: etForm.name.trim() } : e))
        setEtDialogOpen(false)
      }
    } else {
      const { data, error } = await supabase.from('expense_types')
        .insert({ user_id: user.id, name: etForm.name.trim(), is_default: false })
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

  const expenses = categories.filter(c => c.type === 'expense')
  const incomes = categories.filter(c => c.type === 'income')

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Ajustes</h1>

      {/* Mi cuenta */}
      <Card>
        <CardHeader><CardTitle className="text-base">Mi cuenta</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="bg-emerald-600 text-white text-lg font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-gray-900">{name}</p>
              <p className="text-sm text-gray-400">{user.email}</p>
            </div>
          </div>
          <Separator />
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 text-gray-600"><Mail className="h-4 w-4 text-gray-400" /><span>{user.email}</span></div>
            <div className="flex items-center gap-3 text-gray-600"><Shield className="h-4 w-4 text-gray-400" /><span>Email {user.email_confirmed_at ? 'verificado' : 'sin verificar'}</span></div>
            <div className="flex items-center gap-3 text-gray-600"><User className="h-4 w-4 text-gray-400" /><span>Cuenta creada el {new Date(user.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}</span></div>
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
            <div key={et.id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-gray-50">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">{et.name}</span>
                {et.is_default && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">predeterminado</span>}
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEditEt(et)} className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors rounded-md hover:bg-gray-100">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                {!et.is_default && (
                  <button onClick={() => handleDeleteEt(et.id)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-md hover:bg-red-50">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
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
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Gastos</p>
            <div className="space-y-0.5">
              {expenses.map(c => (
                <div key={c.id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base flex-shrink-0">{c.icon}</span>
                    <div className="min-w-0">
                      <span className="text-sm text-gray-700">{c.name}</span>
                      {c.expense_type && (
                        <span className="ml-2 text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">{c.expense_type.name}</span>
                      )}
                    </div>
                    {c.is_default && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full flex-shrink-0">predeterminada</span>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => openEditCat(c)} className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors rounded-md hover:bg-gray-100"><Pencil className="h-3.5 w-3.5" /></button>
                    {!c.is_default && (
                      <button onClick={() => handleDeleteCat(c.id)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-md hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Separator />
          {/* Ingresos */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Ingresos</p>
            <div className="space-y-0.5">
              {incomes.map(c => (
                <div key={c.id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base flex-shrink-0">{c.icon}</span>
                    <span className="text-sm text-gray-700">{c.name}</span>
                    {c.is_default && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">predeterminada</span>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => openEditCat(c)} className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors rounded-md hover:bg-gray-100"><Pencil className="h-3.5 w-3.5" /></button>
                    {!c.is_default && (
                      <button onClick={() => handleDeleteCat(c.id)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-md hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
                    )}
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
                        : 'border-gray-200 text-gray-500 hover:border-gray-300')}>
                    {t === 'expense' ? 'Gasto' : 'Ingreso'}
                  </button>
                ))}
              </div>
            </div>

            {/* Tipo de gasto (solo para expenses) */}
            {catForm.type === 'expense' && (
              <div className="space-y-2">
                <Label>Tipo de gasto</Label>
                <Select value={catForm.expense_type_id} onValueChange={v => setCatForm({ ...catForm, expense_type_id: v ?? '' })}>
                  <SelectTrigger className="w-full">
                    <span className={catForm.expense_type_id ? 'text-sm' : 'text-sm text-muted-foreground'}>
                      {expenseTypes.find(e => e.id === catForm.expense_type_id)?.name ?? 'Sin clasificar'}
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin clasificar</SelectItem>
                    {expenseTypes.map(et => <SelectItem key={et.id} value={et.id}>{et.name}</SelectItem>)}
                  </SelectContent>
                </Select>
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
                      catForm.icon === icon ? 'bg-emerald-100 ring-2 ring-emerald-500' : 'hover:bg-gray-100')}>
                    {icon}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-500">O escribí uno:</span>
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

      {/* Dialog tipo de gasto */}
      <Dialog open={etDialogOpen} onOpenChange={setEtDialogOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>{editingEt ? 'Editar tipo de gasto' : 'Nuevo tipo de gasto'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveEt} className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input placeholder="Ej: Gasto discrecional, Inversión..." value={etForm.name} onChange={e => setEtForm({ name: e.target.value })} required />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setEtDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={etLoading} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                {etLoading ? 'Guardando...' : editingEt ? 'Guardar' : 'Crear'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
