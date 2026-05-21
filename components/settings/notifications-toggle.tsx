'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff } from 'lucide-react'
import { toast } from 'sonner'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export function NotificationsToggle() {
  const [status, setStatus]   = useState<'loading' | 'unsupported' | 'denied' | 'enabled' | 'disabled'>('loading')
  const [working, setWorking] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }
    if (Notification.permission === 'denied') {
      setStatus('denied')
      return
    }
    navigator.serviceWorker.ready.then(async reg => {
      const sub = await reg.pushManager.getSubscription()
      setStatus(sub ? 'enabled' : 'disabled')
    })
  }, [])

  async function enable() {
    setWorking(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus('denied')
        toast.error('Permiso de notificaciones denegado')
        return
      }
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      })
      const { endpoint, keys } = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } }
      const res = await fetch('/api/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint, p256dh: keys.p256dh, auth: keys.auth }),
      })
      if (!res.ok) throw new Error('Error al guardar suscripción')
      setStatus('enabled')
      toast.success('Notificaciones activadas')
    } catch (err) {
      toast.error('No se pudo activar las notificaciones')
    } finally {
      setWorking(false)
    }
  }

  async function disable() {
    setWorking(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setStatus('disabled')
      toast.success('Notificaciones desactivadas')
    } catch {
      toast.error('Error al desactivar')
    } finally {
      setWorking(false)
    }
  }

  if (status === 'loading') return null

  if (status === 'unsupported') return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/40 border border-border">
      <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F59E0B18' }}>
        <BellOff className="h-4 w-4" style={{ color: '#F59E0B' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">Notificaciones</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">No soportado en este navegador</p>
      </div>
    </div>
  )

  if (status === 'denied') return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/40 border border-border">
      <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FF4D6D18' }}>
        <BellOff className="h-4 w-4" style={{ color: '#FF4D6D' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">Notificaciones bloqueadas</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">Habilitá los permisos desde la configuración del navegador</p>
      </div>
    </div>
  )

  const isEnabled = status === 'enabled'
  const color = isEnabled ? '#00CB96' : '#7C4DFF'

  return (
    <button
      onClick={isEnabled ? disable : enable}
      disabled={working}
      className="w-full flex items-center gap-3 p-4 rounded-xl border transition-all text-left"
      style={isEnabled
        ? { backgroundColor: '#00CB9612', borderColor: '#00CB9640' }
        : { backgroundColor: 'transparent', borderColor: 'hsl(var(--border))' }
      }
    >
      <div
        className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: color + '20' }}
      >
        {isEnabled
          ? <Bell className="h-4 w-4" style={{ color }} />
          : <BellOff className="h-4 w-4" style={{ color }} />
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">
          {working ? 'Procesando...' : isEnabled ? 'Notificaciones activas' : 'Activar notificaciones'}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {isEnabled
            ? 'Recibís avisos el día anterior a cada vencimiento'
            : 'Avisamos cuando un gasto o tarjeta está por vencer'
          }
        </p>
      </div>
      {/* Toggle visual */}
      <div
        className="w-10 h-6 rounded-full flex-shrink-0 flex items-center transition-colors px-0.5"
        style={{ backgroundColor: isEnabled ? '#00CB96' : 'hsl(var(--muted))' }}
      >
        <div
          className="w-5 h-5 rounded-full bg-white shadow transition-transform"
          style={{ transform: isEnabled ? 'translateX(16px)' : 'translateX(0px)' }}
        />
      </div>
    </button>
  )
}
