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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { LogOut, User, Mail, Shield, Plus, Trash2, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { Category } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  user: SupabaseUser
  categories: Category[]
}

const COMMON_ICONS = ['🏠', '🍔', '🚗', '💊', '🎬', '👕', '✈️', '📚', '💡', '🐾', '🎮', '💰', '💼', '🎁', '🏋️', '🛒', '☕', '🍕', '🎵', '💅']

type CategoryForm = { name: string; icon: string; type: 'income' | 'expense' }
const emptyForm: CategoryForm = { name: '', icon: '🏷️', type: 'expense' }

export function SettingsView({ user, categories: initialCategories }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const name = user.user_metadata?.full_name ?? user.email ?? 'Usuario'
  const initials = name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)

  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [form, setForm] = useState<CategoryForm>(emptyForm)
  const [loading, setLoading] = useState(false)

  async function handleLogout() {
    await supabase.auth.signOut()
    toast.success('Sesión cerrada')
    router.push('/auth/login')
    router.refresh()
  }

  function openCreate() {
    setEditingCategory(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(c: Category) {
    setEditingCategory(c)
    setForm({ name: c.name, icon: c.icon, type: c.type })
    setDialogOpen(true)
  }

  async function handleSaveCategory(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setLoading(true)

    if (editingCategory) {
      const { error } = await supabase
        .from('categories')
        .update({ name: form.name.trim(), icon: form.icon, type: form.type })
        .eq('id', editingCategory.id)
      if (error) {
        toast.error('Error al guardar')
      } else {
        toast.success('Categoría actualizada')
        setCategories(prev => prev.map(c => c.id === editingCategory.id ? { ...c, name: form.name.trim(), icon: form.icon, type: form.type } : c))
        setDialogOpen(false)
      }
    } else {
      const { data, error } = await supabase
        .from('categories')
        .insert({ user_id: user.id, name: form.name.trim(), icon: form.icon, type: form.type, color: '#6b7280', is_default: false })
        .select()
        .single()
      if (error) {
        toast.error('Error al crear categoría')
      } else {
        toast.success('Categoría creada')
        setCategories(prev => [...prev, data])
        setDialogOpen(false)
        setForm(emptyForm)
      }
    }
    setLoading(false)
  }

  async function handleDeleteCategory(id: string) {
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) {
      toast.error('No se puede eliminar (tiene transacciones asociadas)')
    } else {
      toast.success('Categoría eliminada')
      setCategories(prev => prev.filter(c => c.id !== id))
    }
  }

  const expenses = categories.filter(c => c.type === 'expense')
  const incomes = categories.filter(c => c.type === 'income')

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Ajustes</h1>

      {/* Mi cuenta */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mi cuenta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="bg-emerald-600 text-white text-lg font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-gray-900">{name}</p>
              <p className="text-sm text-gray-400">{user.email}</p>
            </div>
          </div>
          <Separator />
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 text-gray-600">
              <Mail className="h-4 w-4 text-gray-400" />
              <span>{user.email}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <Shield className="h-4 w-4 text-gray-400" />
              <span>Email {user.email_confirmed_at ? 'verificado' : 'sin verificar'}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <User className="h-4 w-4 text-gray-400" />
              <span>Cuenta creada el {new Date(user.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Categorías */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Categorías</CardTitle>
          <Button size="sm" onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700 h-8">
            <Plus className="h-4 w-4 mr-1" /> Nueva
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Gastos</p>
            <div className="space-y-0.5">
              {expenses.map(c => (
                <div key={c.id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base flex-shrink-0">{c.icon}</span>
                    <span className="text-sm text-gray-700 truncate">{c.name}</span>
                    {c.is_default && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full flex-shrink-0">predeterminada</span>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors rounded-md hover:bg-gray-100">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {!c.is_default && (
                      <button onClick={() => handleDeleteCategory(c.id)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-md hover:bg-red-50">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Ingresos</p>
            <div className="space-y-0.5">
              {incomes.map(c => (
                <div key={c.id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base flex-shrink-0">{c.icon}</span>
                    <span className="text-sm text-gray-700 truncate">{c.name}</span>
                    {c.is_default && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full flex-shrink-0">predeterminada</span>}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-gray-700 transition-colors rounded-md hover:bg-gray-100">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {!c.is_default && (
                      <button onClick={() => handleDeleteCategory(c.id)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-md hover:bg-red-50">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
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
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar sesión
          </Button>
        </CardContent>
      </Card>

      {/* Dialog crear / editar categoría */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveCategory} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <div className="flex gap-2">
                {(['expense', 'income'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({ ...form, type: t })}
                    className={cn(
                      'flex-1 py-2 rounded-lg text-sm font-medium border transition-colors',
                      form.type === t
                        ? t === 'expense' ? 'bg-red-500 text-white border-red-500' : 'bg-emerald-600 text-white border-emerald-600'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    )}
                  >
                    {t === 'expense' ? 'Gasto' : 'Ingreso'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input placeholder="Ej: Gimnasio, Freelance..." value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>

            <div className="space-y-2">
              <Label>Ícono</Label>
              <div className="grid grid-cols-10 gap-1">
                {COMMON_ICONS.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setForm({ ...form, icon })}
                    className={cn(
                      'h-8 w-8 rounded-lg text-base flex items-center justify-center transition-colors',
                      form.icon === icon ? 'bg-emerald-100 ring-2 ring-emerald-500' : 'hover:bg-gray-100'
                    )}
                  >
                    {icon}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-500">O escribí uno:</span>
                <Input
                  className="w-16 text-center"
                  maxLength={2}
                  value={form.icon}
                  onChange={e => setForm({ ...form, icon: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                {loading ? 'Guardando...' : editingCategory ? 'Guardar cambios' : 'Crear'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
