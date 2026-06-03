interface AccessDeniedPageProps {
  message: string
  onSignOut: () => void
}

export function AccessDeniedPage({ message, onSignOut }: AccessDeniedPageProps) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[var(--color-cream)] px-6 text-center">
      <h1 className="text-xl font-semibold text-[var(--color-ink)]">Access denied</h1>
      <p className="max-w-sm text-sm text-[var(--color-muted)]">{message}</p>
      <button
        type="button"
        onClick={() => onSignOut()}
        className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white"
      >
        Back to sign in
      </button>
    </div>
  )
}
