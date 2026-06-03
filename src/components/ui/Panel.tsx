import type { ReactNode } from 'react'

interface PanelProps {
  children: ReactNode
  className?: string
}

export function Panel({ children, className = '' }: PanelProps) {
  return (
    <div
      className={`rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(26,24,20,0.04)] sm:p-6 ${className}`}
    >
      {children}
    </div>
  )
}
