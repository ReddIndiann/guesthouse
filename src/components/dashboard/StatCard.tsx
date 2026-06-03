interface StatCardProps {
  label: string
  value: string | number
  hint?: string
}

export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="min-w-0 rounded-2xl bg-white px-4 py-3 shadow-[0_1px_2px_rgba(26,24,20,0.04)] sm:px-5 sm:py-4">
      <p className="truncate text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted)] sm:text-xs">
        {label}
      </p>
      <p className="mt-0.5 truncate text-2xl font-semibold tracking-tight text-[var(--color-ink)] sm:mt-1 sm:text-3xl">
        {value}
      </p>
      {hint && (
        <p className="mt-0.5 truncate text-[10px] text-[var(--color-muted)] sm:text-xs">{hint}</p>
      )}
    </div>
  )
}
