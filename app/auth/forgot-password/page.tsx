'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Wallet, ArrowLeft, MailCheck } from 'lucide-react'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    // Always show success (don't reveal if email exists)
    setSent(true)
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
          {sent ? (
            <div className="text-center py-4 space-y-4">
              <div
                className="h-14 w-14 rounded-2xl mx-auto flex items-center justify-center"
                style={{ background: 'rgba(0,203,150,0.12)' }}
              >
                <MailCheck className="h-7 w-7" style={{ color: '#00CB96' }} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Email enviado</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Si el email existe, vas a recibir un link para restablecer tu contraseña.
                </p>
              </div>
              <Link
                href="/auth/login"
                className="flex items-center justify-center gap-2 text-sm font-semibold mt-2"
                style={{ color: '#7C4DFF' }}
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-foreground mb-0.5">Recuperar contraseña</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Ingresá tu email y te enviamos un link para restablecer tu contraseña.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
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
                  {loading ? 'Enviando...' : 'Enviar link'}
                </Button>
              </form>

              <Link
                href="/auth/login"
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-5 hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Volver al inicio de sesión
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
