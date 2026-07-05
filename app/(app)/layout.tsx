import { Sidebar } from '@/components/layout/sidebar'
import { MobileNav } from '@/components/layout/mobile-nav'
import { FloatingActionButton } from '@/components/layout/fab'
import { InstallBanner } from '@/components/layout/install-banner'
import { PullToRefresh } from '@/components/layout/pull-to-refresh'
import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let avisosCount = 0
  if (user) {
    const now   = new Date()
    const month = now.getMonth() + 1
    const year  = now.getFullYear()
    const [{ count: fc }, { count: cc }] = await Promise.all([
      supabase.from('fixed_expense_items').select('*', { count: 'exact', head: true })
        .eq('user_id', user.id).eq('month', month).eq('year', year)
        .eq('status', 'pending').not('due_day', 'is', null),
      supabase.from('credit_card_months').select('*', { count: 'exact', head: true })
        .eq('user_id', user.id).eq('month', month).eq('year', year)
        .eq('status', 'pending').not('due_date', 'is', null),
    ])
    avisosCount = (fc ?? 0) + (cc ?? 0)
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <PullToRefresh>{children}</PullToRefresh>
      <Suspense>
        <MobileNav userEmail={user?.email} avisosCount={avisosCount} />
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
