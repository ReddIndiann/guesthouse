import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LoadingScreen } from '../components/ui/LoadingScreen'
import { RegisterOrgModal } from '../components/auth/RegisterOrgModal'

export function LoginPage() {
  const { user, profile, loading, profileError, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2.5 pr-10 outline-none focus:border-[var(--color-accent)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--color-muted)] hover:text-[var(--color-ink)] transition"
                  aria-label={showPassword ? 'Hide password' : 'View password'}
                  title={showPassword ? 'Hide password' : 'View password'}
                >
                  {showPassword ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
                      <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
                      <path d="M17.479 17.499A10.75 10.75 0 0 1 2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 2.799-4.208" />
                      <line x1="2" x2="22" y1="2" y2="22" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
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
            <span className="relative bg-[var(--color-cream)] px-3 text-[11px] uppercase tracking-wider text-[var(--color-muted)] font-medium">
              Hotels · Guest Houses · Airbnbs
            </span>
          </div>

          <button
            type="button"
            onClick={() => setRegisterOpen(true)}
            className="w-full rounded-lg border border-[var(--color-line)] bg-white py-2.5 px-4 text-xs font-medium text-[var(--color-ink)] hover:bg-[var(--color-cream)] hover:border-[var(--color-accent)]/40 transition shadow-xs flex items-center justify-center gap-2"
          >
            <span>Get your property on Guestplace</span>
            <span className="text-[10px] rounded-full bg-[var(--color-accent)]/10 text-[var(--color-accent)] font-semibold px-2 py-0.5">
              Get Started
            </span>
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
