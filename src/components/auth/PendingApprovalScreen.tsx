import { useAuth } from '../../context/AuthContext'

export function PendingApprovalScreen() {
  const { profile, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-[var(--color-cream)] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl p-8 border border-[var(--color-line)] shadow-sm text-center space-y-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-cream)] border border-[var(--color-line)] text-[var(--color-accent)]">
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>

        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold tracking-tight text-[var(--color-ink)]">
            Application under review
          </h1>
          <p className="text-sm text-[var(--color-muted)] leading-relaxed">
            Thank you for registering{' '}
            <strong className="text-[var(--color-ink)] font-medium">
              {profile?.organizationName || 'your organization'}
            </strong>
            . Your application is currently awaiting administrator approval.
          </p>
        </div>

        <div className="rounded-xl bg-[var(--color-cream)] p-4 text-left border border-[var(--color-line)] space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-[var(--color-line)]">
            <span className="text-[var(--color-muted)]">Applicant</span>
            <span className="font-medium text-[var(--color-ink)]">{profile?.displayName}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[var(--color-line)]">
            <span className="text-[var(--color-muted)]">Registered email</span>
            <span className="font-medium text-[var(--color-ink)]">{profile?.email}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-[var(--color-muted)]">Status</span>
            <span className="font-medium text-amber-900">
              Pending review
            </span>
          </div>
        </div>

        <p className="text-xs text-[var(--color-muted)]">
          Once your account is approved, you will have immediate access to manage your branches, rooms, and staff.
        </p>

        <div className="pt-1">
          <button
            type="button"
            onClick={() => signOut()}
            className="w-full rounded-lg border border-[var(--color-line)] bg-white py-2.5 text-sm font-medium text-[var(--color-ink)] hover:bg-[var(--color-cream)] transition"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
