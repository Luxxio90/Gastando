'use client'

import { AlertTriangle } from 'lucide-react'

interface Props {
  title?: string
  message?: string
}

export function ErrorState({
  title = 'Error al cargar',
  message = 'No se pudo conectar con el servidor. Intentá recargar la página.',
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div
        className="h-14 w-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ backgroundColor: '#FF4D6D18' }}
      >
        <AlertTriangle className="h-6 w-6" style={{ color: '#FF4D6D' }} />
      </div>
      <p className="text-base font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs">{message}</p>
      <button
        onClick={() => window.location.reload()}
        className="mt-6 px-4 py-2 rounded-xl text-sm font-semibold border border-border hover:bg-muted/40 transition-colors text-foreground"
      >
        Reintentar
      </button>
    </div>
  )
}
