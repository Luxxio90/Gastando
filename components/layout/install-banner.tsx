'use client'

import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function InstallBanner() {
  const [promptEvt, setPromptEvt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setPromptEvt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setDismissed(true))
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!promptEvt || dismissed) return null

  async function install() {
    if (!promptEvt) return
    promptEvt.prompt()
    const { outcome } = await promptEvt.userChoice
    if (outcome === 'accepted') setDismissed(true)
    setPromptEvt(null)
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:hidden">
      <div className="bg-card border border-primary/30 rounded-2xl p-4 flex items-center gap-3 shadow-xl shadow-black/50">
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#7C4DFF25' }}
        >
          <Download className="h-5 w-5" style={{ color: '#7C4DFF' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Instalar Gastando</p>
          <p className="text-xs text-muted-foreground">Agregá la app a tu pantalla principal</p>
        </div>
        <button
          onClick={install}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white flex-shrink-0"
          style={{ backgroundColor: '#7C4DFF' }}
        >
          Instalar
        </button>
        <button onClick={() => setDismissed(true)} className="text-muted-foreground flex-shrink-0">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
