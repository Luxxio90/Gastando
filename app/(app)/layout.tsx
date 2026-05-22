import { Sidebar } from '@/components/layout/sidebar'
import { MobileNav } from '@/components/layout/mobile-nav'
import { FloatingActionButton } from '@/components/layout/fab'
import { InstallBanner } from '@/components/layout/install-banner'
import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto pb-20 md:pb-0">{children}</main>
      <Suspense>
        <MobileNav userEmail={user?.email} />
      </Suspense>
      {user && <FloatingActionButton userId={user.id} />}
      <InstallBanner />
      <script dangerouslySetInnerHTML={{ __html: `
        if ('serviceWorker' in navigator) {
          window.addEventListener('load', function() {
            navigator.serviceWorker.register('/sw.js')
              .then(function(r) { console.log('[SW] registrado, scope:', r.scope); })
              .catch(function(e) { console.error('[SW] error:', e); });
          });
        }
      `}} />
    </div>
  )
}
