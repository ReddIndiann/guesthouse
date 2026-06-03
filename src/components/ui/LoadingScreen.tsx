interface LoadingScreenProps {
  message?: string
}

export function LoadingScreen({ message = 'Loading…' }: LoadingScreenProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[var(--color-cream)] px-6">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-line)] border-t-[var(--color-accent)]" />
      <p className="text-sm text-[var(--color-muted)]">{message}</p>
    </div>
  )
}
