import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BarChart2 } from 'lucide-react'

export default async function EstadisticasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  return (
    <div className="p-6 pb-24 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Estadísticas</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Análisis de tus finanzas</p>
      </div>

      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <div
          className="h-16 w-16 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: '#3BB2F620' }}
        >
          <BarChart2 className="h-8 w-8" style={{ color: '#3BB2F6' }} />
        </div>
        <div>
          <p className="font-bold text-lg text-foreground">Próximamente</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-[240px]">
            Gráficos de gastos por categoría, tendencias mensuales y más.
          </p>
        </div>
      </div>
    </div>
  )
}
