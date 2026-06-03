import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: ReactNode
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between md:mb-10">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-2xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-[var(--color-muted)] sm:text-base">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  )
}
