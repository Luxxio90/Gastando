'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Wallet, Eye, EyeOff } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirm) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.name } },
    })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('¡Cuenta creada! Revisá tu email para confirmar.')
      router.push('/auth/login')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(124,77,255,0.15) 0%, transparent 70%)' }} />
      <div className="absolute bottom-0 right-0 w-72 h-72 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,203,150,0.08) 0%, transparent 70%)' }} />

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
          <p className="text-sm text-muted-foreground mt-1">Controlá tus finanzas personales</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-3xl p-6 shadow-2xl">
          <h2 className="text-xl font-bold text-foreground mb-0.5">Crear cuenta</h2>
          <p className="text-sm text-muted-foreground mb-6">Empezá a controlar tus finanzas hoy</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nombre</Label>
              <Input
                id="name"
                placeholder="Juan Pérez"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                required
                className="h-11 rounded-xl bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-[#7C4DFF]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
                className="h-11 rounded-xl bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-[#7C4DFF]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Contraseña</Label>
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
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-5">
            ¿Ya tenés cuenta?{' '}
            <Link href="/auth/login" className="font-semibold" style={{ color: '#7C4DFF' }}>
              Iniciá sesión
            </Link>
          </p>
        </div>

        <p className="text-center text-[11px] text-muted-foreground/50 mt-5">
          Al registrarte aceptás nuestros{' '}
          <Link href="/terminos" className="underline hover:text-muted-foreground transition-colors">Términos de Uso</Link>
          {' '}y{' '}
          <Link href="/privacidad" className="underline hover:text-muted-foreground transition-colors">Política de Privacidad</Link>
        </p>
      </div>
    </div>
  )
}
