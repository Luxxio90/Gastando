'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export function MonthNav({ month, year }: { month: number; year: number }) {
  const router = useRouter()

  function navigate(dir: -1 | 1) {
    let m = month + dir, y = year
    if (m < 1) { m = 12; y-- }
    if (m > 12) { m = 1; y++ }
    router.push(`/dashboard?month=${m}&year=${y}`)
  }

  const now = new Date()
  const isCurrent = month === now.getMonth() + 1 && year === now.getFullYear()

  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={() => navigate(-1)}
        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="flex items-center gap-1.5 px-1">
        <span className="text-sm font-semibold text-foreground capitalize">
          {MONTHS[month - 1]} {year}
        </span>
        {isCurrent && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{ backgroundColor: '#7C4DFF20', color: '#7C4DFF' }}
          >
            hoy
          </span>
        )}
      </div>
      <button
        onClick={() => navigate(1)}
        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
