import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LoadingScreen } from '../components/ui/LoadingScreen'
import { RegisterOrgModal } from '../components/auth/RegisterOrgModal'

export function LoginPage() {
  const { user, profile, loading, profileError, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [registerOpen, setRegisterOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (loading) return <LoadingScreen message="Checking session…" />
  if (user && profile && !profileError) return <Navigate to="/" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await signIn(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--color-cream)] px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
            Guestplace
          </h1>
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Staff sign in — accounts are created by an administrator
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(26,24,20,0.04)] sm:p-8"
        >
          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-[var(--color-ink)]">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2.5 outline-none focus:border-[var(--color-accent)]"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-[var(--color-ink)]">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2.5 outline-none focus:border-[var(--color-accent)]"
              />
            </label>

            {(error || profileError) && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error ?? profileError}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-1 w-full rounded-lg bg-[var(--color-accent)] py-2.5 text-sm font-medium text-white disabled:opacity-60 hover:opacity-95 transition"
            >
              {submitting ? 'Please wait…' : 'Sign in'}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center space-y-3">
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--color-line)]" />
            </div>
            <span className="relative bg-[var(--color-cream)] px-3 text-xs uppercase tracking-wider text-[var(--color-muted)]">
              New to Guestplace?
            </span>
          </div>

          <button
            type="button"
            onClick={() => setRegisterOpen(true)}
            className="w-full rounded-lg border border-[var(--color-line)] bg-white py-2.5 px-4 text-xs font-medium text-[var(--color-ink)] hover:bg-[var(--color-cream)] transition"
          >
            Register new organization
          </button>
        </div>
      </div>

      <RegisterOrgModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
      />
    </div>
  )
}
