'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export function MonthNav({ month, year, basePath = '/dashboard', light = false }: { month: number; year: number; basePath?: string; light?: boolean }) {
  const router = useRouter()

  function navigate(dir: -1 | 1) {
    let m = month + dir, y = year
    if (m < 1) { m = 12; y-- }
    if (m > 12) { m = 1; y++ }
    router.push(`${basePath}?month=${m}&year=${y}`)
  }

  const now = new Date()
  const isCurrent = month === now.getMonth() + 1 && year === now.getFullYear()

  const btnCls = light
    ? 'p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white/80'
    : 'p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground'

  return (
    <div className="flex items-center gap-0.5">
      <button onClick={() => navigate(-1)} className={btnCls}>
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-1.5 px-1">
        <span className={`text-sm font-semibold capitalize ${light ? 'text-white' : 'text-foreground'}`}>
          {MONTHS[month - 1]} {year}
        </span>
        {isCurrent && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={light
              ? { backgroundColor: 'rgba(255,255,255,0.25)', color: '#fff' }
              : { backgroundColor: '#7C4DFF20', color: '#7C4DFF' }
            }
          >
            hoy
          </span>
        )}
      </div>
      <button onClick={() => navigate(1)} className={btnCls}>
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
