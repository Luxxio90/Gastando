import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'ARS') {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(amount)
}

export function formatDate(date: string) {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}
