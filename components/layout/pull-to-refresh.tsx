'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

const THRESHOLD = 72

export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [pullY, setPullY] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef<number | null>(null)
  const active = useRef(false)

  function onTouchStart(e: React.TouchEvent) {
    if (window.scrollY > 0) return
    startY.current = e.touches[0].clientY
    active.current = true
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!active.current || startY.current === null) return
    if (window.scrollY > 0) { active.current = false; return }

    const dy = e.touches[0].clientY - startY.current
    if (dy <= 0) return

    setPullY(Math.min(dy, THRESHOLD * 1.3))
  }

  function onTouchEnd() {
    if (!active.current) return
    active.current = false
    startY.current = null

    if (pullY >= THRESHOLD && !refreshing) {
      setRefreshing(true)
      setPullY(THRESHOLD * 0.6)
      router.refresh()
      setTimeout(() => {
        setRefreshing(false)
        setPullY(0)
      }, 900)
    } else {
      setPullY(0)
    }
  }

  const showing = pullY > 8 || refreshing
  const indicatorH = refreshing ? 48 : Math.min(pullY * 0.6, 48)
  const opacity = refreshing ? 1 : Math.min(pullY / THRESHOLD, 1)
  const rotation = refreshing ? undefined : `rotate(${(pullY / THRESHOLD) * 270}deg)`

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className="flex-1 overflow-auto pb-20 md:pb-0"
    >
      {/* Indicador */}
      <div
        className="flex items-center justify-center overflow-hidden"
        style={{
          height: showing ? indicatorH : 0,
          transition: active.current ? 'none' : 'height 200ms ease',
        }}
      >
        <div
          className={refreshing ? 'animate-spin' : ''}
          style={{
            height: 28,
            width: 28,
            borderRadius: '50%',
            border: '2.5px solid #00C9A7',
            borderTopColor: 'transparent',
            opacity,
            transform: rotation,
            flexShrink: 0,
          }}
        />
      </div>

      {children}
    </div>
  )
}
