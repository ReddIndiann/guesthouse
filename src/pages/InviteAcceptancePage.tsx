import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getOrganizationByInviteToken, acceptOrganizationInvite } from '../lib/tenants'
import type { Organization, PropertyItem } from '../types/tenant'

export function InviteAcceptancePage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [org, setOrg] = useState<Organization | null>(null)
  const [property, setProperty] = useState<PropertyItem | null>(null)

  // Form state
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) {
      setError('No invitation token provided.')
      setLoading(false)
      return
    }

    getOrganizationByInviteToken(token)
      .then(({ org: loadedOrg, property: loadedProp }) => {
        setOrg(loadedOrg)
        if (loadedProp) setProperty(loadedProp)
        setDisplayName(loadedOrg.ownerName || '')
        setLoading(false)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unable to verify invitation link.')
        setLoading(false)
      })
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    setSubmitError(null)

    if (!displayName.trim()) {
      setSubmitError('Please enter your full name.')
      return
    }

    if (password.length < 6) {
      setSubmitError('Password must be at least 6 characters.')
      return
    }

    if (password !== confirmPassword) {
      setSubmitError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      await acceptOrganizationInvite(token, password, displayName)
      setSuccess(true)
      setTimeout(() => {
        navigate('/', { replace: true })
      }, 1500)
    } catch (err: any) {
      const msg = err?.message || 'Failed to complete registration.'
      if (err?.code === 'auth/email-already-in-use') {
        setSubmitError(
          'An account with this email address already exists. Please log in directly with your existing password.',
        )
      } else {
        setSubmitError(msg)
      }
      setSubmitting(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-cream)] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
          <p className="text-xs text-[var(--color-muted)] font-medium">Verifying invitation…</p>
        </div>
      </div>
    )
  }

  // Error / Invalid Token state
  if (error || !org) {
    return (
      <div className="min-h-screen bg-[var(--color-cream)] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-[var(--color-line)] bg-white p-8 text-center shadow-sm space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-[var(--color-ink)]">Invitation Unavailable</h2>
          <p className="text-xs text-[var(--color-muted)] leading-relaxed">
            {error || 'This invitation link is not valid or has already expired.'}
          </p>
          <div className="pt-2">
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-xl bg-[var(--color-ink)] px-5 py-2.5 text-xs font-medium text-white hover:opacity-90 transition"
            >
              Go to sign in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Already accepted
  if (org.inviteAcceptedAt && org.ownerUid) {
    return (
      <div className="min-h-screen bg-[var(--color-cream)] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-[var(--color-line)] bg-white p-8 text-center shadow-sm space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-[var(--color-ink)]">Workspace already activated</h2>
          <p className="text-xs text-[var(--color-muted)] leading-relaxed">
            The workspace for <strong className="text-[var(--color-ink)]">{org.name}</strong> has already been claimed and activated.
          </p>
          <div className="pt-2">
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-xl bg-[var(--color-accent)] px-5 py-2.5 text-xs font-medium text-white hover:opacity-90 transition"
            >
              Sign in to your account
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const propertyTypeLabel =
    org.propertyType === 'airbnb'
      ? '🔑 Airbnb / Vacation Rental'
      : org.propertyType === 'hotel'
      ? '🏨 Hotel'
      : org.propertyType === 'resort'
      ? '🌴 Resort'
      : '🏡 Guest House'

  return (
    <div className="min-h-screen bg-[var(--color-cream)] py-12 px-4 sm:px-6 flex flex-col items-center justify-center">
      {/* Brand Header */}
      <div className="mb-6 text-center space-y-1">
        <div className="inline-flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-[var(--color-ink)] flex items-center justify-center text-white font-bold text-sm">
            G
          </div>
          <span className="font-semibold text-lg tracking-tight text-[var(--color-ink)]">
            Guestplace
          </span>
        </div>
        <p className="text-xs text-[var(--color-muted)]">Hospitality Operating System</p>
      </div>

      <div className="w-full max-w-lg rounded-2xl border border-[var(--color-line)] bg-white p-6 sm:p-8 shadow-sm space-y-6">
        {/* Welcome Banner */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800 border border-emerald-100">
            ✓ Invitation Verified
          </div>
          <h1 className="text-xl font-bold text-[var(--color-ink)]">
            Welcome to {org.name}
          </h1>
          <p className="text-xs text-[var(--color-muted)]">
            Your workspace has been approved. Complete your administrator profile and choose a password to gain instant access.
          </p>
        </div>

        {/* Property Summary Pill Box */}
        <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-cream)] p-4 space-y-2">
          {property?.name && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--color-muted)]">Initial Branch</span>
              <span className="font-medium text-[var(--color-ink)]">{property.name}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--color-muted)]">Property Type</span>
            <span className="font-medium text-[var(--color-ink)]">{propertyTypeLabel}</span>
          </div>

          {org.location && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--color-muted)]">Location</span>
              <span className="font-medium text-[var(--color-ink)]">{org.location}</span>
            </div>
          )}

          {org.unitsRange && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--color-muted)]">Target Units</span>
              <span className="font-medium text-[var(--color-ink)]">{org.unitsRange}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--color-line)]">
            <span className="text-[var(--color-muted)]">Administrator Email</span>
            <span className="font-mono text-[var(--color-ink)] font-medium">{org.contactEmail}</span>
          </div>
        </div>

        {/* Submit Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {submitError && (
            <div className="rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
              {submitError}
            </div>
          )}

          {success && (
            <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200 font-medium">
              🎉 Workspace activated successfully! Redirecting to your dashboard…
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[var(--color-ink)] mb-1">
              Your full name *
            </label>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={submitting || success}
              className="w-full rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-2.5 text-xs text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] transition disabled:opacity-60"
              placeholder="e.g. Sarah Jenkins"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-ink)] mb-1">
              Set password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting || success}
                className="w-full rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-2.5 pr-10 text-xs text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] transition disabled:opacity-60"
                placeholder="At least 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-xs text-[var(--color-muted)] hover:text-[var(--color-ink)]"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-ink)] mb-1">
              Confirm password *
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={submitting || success}
              className="w-full rounded-xl border border-[var(--color-line)] bg-white px-3.5 py-2.5 text-xs text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] transition disabled:opacity-60"
              placeholder="Re-enter your password"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting || success}
              className="w-full rounded-xl bg-[var(--color-accent)] px-4 py-3 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50 transition shadow-xs flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Activating workspace…</span>
                </>
              ) : success ? (
                <span>Workspace Ready!</span>
              ) : (
                <span>Activate Workspace & Log In →</span>
              )}
            </button>
          </div>
        </form>

        <p className="text-center text-[11px] text-[var(--color-muted)]">
          Need assistance? Reach out to support at{' '}
          <a href="mailto:support@guestplace.app" className="text-[var(--color-accent)] hover:underline">
            support@guestplace.app
          </a>
        </p>
      </div>
    </div>
  )
}
