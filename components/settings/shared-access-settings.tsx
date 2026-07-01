'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Account } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Share2, Copy, Check, Trash2, Link2 } from 'lucide-react'
import { toast } from 'sonner'

interface SharedAccess {
  id: string
  token: string
  name: string
  account_ids: string[]
  fixed_group_names: string[]
}

interface Props {
  accounts: Account[]
  fixedGroupNames: string[]
  initialSharedAccess: SharedAccess | null
  userId: string
}

export function SharedAccessSettings({ accounts, fixedGroupNames, initialSharedAccess, userId }: Props) {
  const supabase = createClient()
  const [sharedAccess, setSharedAccess] = useState<SharedAccess | null>(initialSharedAccess)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [pendingDelete, setPendingDelete] = useState(false)
  const [form, setForm] = useState({ name: '', account_ids: [] as string[], fixed_group_names: [] as string[] })

  function openDialog() {
    setForm(sharedAccess
      ? { name: sharedAccess.name, account_ids: sharedAccess.account_ids, fixed_group_names: sharedAccess.fixed_group_names }
      : { name: '', account_ids: [], fixed_group_names: [] }
    )
    setDialogOpen(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    if (form.account_ids.length === 0) { toast.error('Seleccioná al menos una cuenta'); return }
    setLoading(true)

    if (sharedAccess) {
      const { error } = await supabase.rpc('update_shared_access_record', {
        p_id: sharedAccess.id, p_name: form.name.trim(), p_account_ids: form.account_ids, p_fixed_group_names: form.fixed_group_names
      })
      if (error) { toast.error(error.message); setLoading(false); return }
      setSharedAccess({ ...sharedAccess, name: form.name.trim(), account_ids: form.account_ids, fixed_group_names: form.fixed_group_names })
      toast.success('Acceso actualizado')
    } else {
      const { data, error } = await supabase.rpc('create_shared_access_record', {
        p_token: crypto.randomUUID(), p_name: form.name.trim(), p_account_ids: form.account_ids, p_fixed_group_names: form.fixed_group_names
      })
      if (error) { toast.error(error.message); setLoading(false); return }
      setSharedAccess(data as unknown as SharedAccess)
      toast.success('Acceso compartido creado')
    }

    setLoading(false)
    setDialogOpen(false)
  }

  async function handleDelete() {
    if (!sharedAccess) return
    const { error } = await supabase.rpc('delete_shared_access_record', { p_id: sharedAccess.id })
    if (error) { toast.error(error.message); return }
    setSharedAccess(null)
    setPendingDelete(false)
    toast.success('Acceso eliminado')
  }

  function copyLink() {
    if (!sharedAccess) return
    navigator.clipboard.writeText(`${window.location.origin}/shared/${sharedAccess.token}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('Link copiado')
  }

  function toggleAccount(id: string) {
    setForm(f => ({ ...f, account_ids: f.account_ids.includes(id) ? f.account_ids.filter(x => x !== id) : [...f.account_ids, id] }))
  }

  function toggleGroup(name: string) {
    setForm(f => ({ ...f, fixed_group_names: f.fixed_group_names.includes(name) ? f.fixed_group_names.filter(x => x !== name) : [...f.fixed_group_names, name] }))
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Share2 className="h-4 w-4" style={{ color: '#00C9A7' }} />
            Acceso compartido
          </CardTitle>
          {!sharedAccess && (
            <Button size="sm" onClick={openDialog}
              style={{ background: 'linear-gradient(135deg, #00C9A7 0%, #00B4D8 100%)', color: '#fff', border: 'none' }}
              className="h-8">
              Crear acceso
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {!sharedAccess ? (
            <p className="text-sm text-muted-foreground">
              Compartí la info de tus cuentas con otra persona sin darle acceso a tu cuenta.
            </p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm text-foreground">{sharedAccess.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {sharedAccess.account_ids.length} cuenta{sharedAccess.account_ids.length !== 1 ? 's' : ''}
                    {sharedAccess.fixed_group_names.length > 0 && ` · ${sharedAccess.fixed_group_names.length} grupo${sharedAccess.fixed_group_names.length !== 1 ? 's' : ''} de fijos`}
                  </p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={openDialog}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
                    Editar
                  </button>
                  <button onClick={() => setPendingDelete(true)}
                    className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-red-500 hover:bg-red-500/10 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'hsl(var(--muted))' }}>
                <Link2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-xs text-muted-foreground truncate flex-1">
                  gastandoia.com.ar/shared/{sharedAccess.token}
                </span>
                <button onClick={copyLink}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex-shrink-0"
                  style={copied
                    ? { background: '#00CB9620', color: '#00CB96' }
                    : { background: '#7C4DFF20', color: '#7C4DFF' }
                  }>
                  {copied ? <><Check className="h-3 w-3" /> Copiado</> : <><Copy className="h-3 w-3" /> Copiar</>}
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {accounts.filter(a => sharedAccess.account_ids.includes(a.id)).map(a => (
                  <span key={a.id} className="px-2 py-0.5 rounded-full text-xs font-semibold"
                    style={{ background: a.color + '20', color: a.color }}>
                    {a.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog crear/editar */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm p-0 gap-0 border-border">
          <div className="px-5 pt-5 pb-4 border-b border-border"
            style={{ background: 'linear-gradient(135deg, #00C9A718 0%, transparent 100%)' }}>
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#00C9A720' }}>
                <Share2 className="h-4 w-4" style={{ color: '#00C9A7' }} />
              </div>
              <DialogTitle className="text-base font-semibold">
                {sharedAccess ? 'Editar acceso' : 'Crear acceso compartido'}
              </DialogTitle>
            </div>
          </div>

          <form onSubmit={handleSave} className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Nombre de la persona</Label>
              <Input
                placeholder="Ej: Mi pareja, Familiar..."
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                required
                className="bg-muted/40 border-border/60"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">Cuentas a compartir</Label>
              <div className="space-y-1.5">
                {accounts.map(a => (
                  <button key={a.id} type="button" onClick={() => toggleAccount(a.id)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all"
                    style={form.account_ids.includes(a.id)
                      ? { borderColor: a.color + '60', background: a.color + '12' }
                      : { borderColor: 'hsl(var(--border))', background: 'transparent' }
                    }>
                    <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />
                    <span className="text-sm font-medium text-foreground flex-1 text-left">{a.name}</span>
                    {form.account_ids.includes(a.id) && <Check className="h-4 w-4" style={{ color: a.color }} />}
                  </button>
                ))}
              </div>
            </div>

            {fixedGroupNames.length > 0 && (
              <div className="space-y-2">
                <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                  Grupos de gastos fijos (opcional)
                </Label>
                <div className="space-y-1.5">
                  {fixedGroupNames.map(name => (
                    <button key={name} type="button" onClick={() => toggleGroup(name)}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl border transition-all"
                      style={form.fixed_group_names.includes(name)
                        ? { borderColor: '#7C4DFF60', background: '#7C4DFF12' }
                        : { borderColor: 'hsl(var(--border))', background: 'transparent' }
                      }>
                      <span className="text-sm font-medium text-foreground flex-1 text-left">{name}</span>
                      {form.fixed_group_names.includes(name) && <Check className="h-4 w-4" style={{ color: '#7C4DFF' }} />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={loading} className="flex-1 font-semibold"
                style={{ background: 'linear-gradient(135deg, #00C9A7 0%, #00B4D8 100%)', color: '#fff', border: 'none' }}>
                {loading ? 'Guardando...' : sharedAccess ? 'Guardar cambios' : 'Crear acceso'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog eliminar */}
      <Dialog open={pendingDelete} onOpenChange={setPendingDelete}>
        <DialogContent className="sm:max-w-xs p-0 gap-0 border-border overflow-hidden">
          <div className="px-5 pt-5 pb-4 border-b border-border"
            style={{ background: 'linear-gradient(135deg, #FF4D6D12 0%, transparent 100%)' }}>
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FF4D6D20' }}>
                <Trash2 className="h-4 w-4" style={{ color: '#FF4D6D' }} />
              </div>
              <DialogTitle className="text-base font-semibold">Eliminar acceso</DialogTitle>
            </div>
          </div>
          <div className="px-5 py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              El link dejará de funcionar y la persona no podrá ver más la información.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setPendingDelete(false)}>Cancelar</Button>
              <Button className="flex-1 font-semibold" onClick={handleDelete}
                style={{ backgroundColor: '#FF4D6D', color: '#fff', border: 'none' }}>
                Eliminar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
