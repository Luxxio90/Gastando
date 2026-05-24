'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PwaInstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (localStorage.getItem('pwa-dismissed') === '1') return
    if (window.matchMedia('(display-mode: standalone)').matches) return

    function handler(e: Event) {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (!prompt || dismissed) return null

  async function handleInstall() {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setDismissed(true)
    setPrompt(null)
  }

  function handleDismiss() {
    localStorage.setItem('pwa-dismissed', '1')
    setDismissed(true)
  }

  return (
    <div
      className="fixed bottom-20 left-4 right-4 z-50 md:hidden rounded-2xl border border-border shadow-2xl overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #7C4DFF18 0%, #0C0B18 60%), hsl(var(--card))' }}
    >
      <div className="p-4 flex items-center gap-3">
        <div
          className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #7C4DFF 0%, #9C6DFF 100%)' }}
        >
          <Download className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Instalar Gastando</p>
          <p className="text-[11px] text-muted-foreground">Agregá la app a tu pantalla de inicio</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleInstall}
            className="text-xs font-bold px-3 py-1.5 rounded-lg text-white"
            style={{ background: 'linear-gradient(135deg, #7C4DFF 0%, #9C6DFF 100%)' }}
          >
            Instalar
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
