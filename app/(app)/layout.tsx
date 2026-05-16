import { Sidebar } from '@/components/layout/sidebar'
import { MobileNav } from '@/components/layout/mobile-nav'
import { FloatingActionButton } from '@/components/layout/fab'
import { createClient } from '@/lib/supabase/server'
import { Suspense } from 'react'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto pb-20 md:pb-0">{children}</main>
      <Suspense>
        <MobileNav />
      </Suspense>
      {user && <FloatingActionButton userId={user.id} />}
    </div>
  )
}
