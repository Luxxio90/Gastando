import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'Gastando',
    short_name: 'Gastando',
    description: 'Tu app de finanzas personales',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#0C0B18',
    theme_color: '#0C0B18',
    orientation: 'portrait',
    prefer_related_applications: false,
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
