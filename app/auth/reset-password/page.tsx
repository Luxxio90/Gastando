'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Wallet, Eye, EyeOff } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({ password: '', confirm: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirm) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: form.password })
    if (error) {
      toast.error('El link expiró o es inválido. Solicitá uno nuevo.')
    } else {
      toast.success('Contraseña actualizada correctamente')
      router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(124,77,255,0.15) 0%, transparent 70%)' }} />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="h-16 w-16 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #7C4DFF 0%, #9C6DFF 100%)', boxShadow: '0 8px 32px rgba(124,77,255,0.35)' }}
          >
            <Wallet className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Gastando</h1>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-3xl p-6 shadow-2xl">
          <h2 className="text-xl font-bold text-foreground mb-0.5">Nueva contraseña</h2>
          <p className="text-sm text-muted-foreground mb-6">Ingresá tu nueva contraseña para continuar.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nueva contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={6}
                  className="h-11 rounded-xl bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-[#7C4DFF] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Confirmar contraseña</Label>
              <Input
                id="confirm"
                type="password"
                placeholder="••••••••"
                value={form.confirm}
                onChange={e => setForm({ ...form, confirm: e.target.value })}
                required
                className="h-11 rounded-xl bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-[#7C4DFF]"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl font-semibold text-white mt-2"
              style={{ background: 'linear-gradient(135deg, #7C4DFF 0%, #9C6DFF 100%)', boxShadow: '0 4px 16px rgba(124,77,255,0.3)' }}
            >
              {loading ? 'Guardando...' : 'Guardar contraseña'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
