import { useState, type FormEvent } from 'react'
import { registerOrganization } from '../../lib/tenants'

interface RegisterOrgModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function RegisterOrgModal({ open, onClose, onSuccess }: RegisterOrgModalProps) {
  const [orgName, setOrgName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [estimatedProperties, setEstimatedProperties] = useState<number>(1)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      await registerOrganization({
        organizationName: orgName.trim(),
        ownerName: ownerName.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
        estimatedProperties,
        notes: notes.trim() || undefined,
      })

      onClose()
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 sm:p-7 shadow-xl border border-[var(--color-line)] max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between pb-4 border-b border-[var(--color-line)]">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-ink)]">
              Register organization
            </h2>
            <p className="text-xs text-[var(--color-muted)] mt-1">
              Submit your organization details to create an account.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--color-muted)] hover:bg-[var(--color-cream)] hover:text-[var(--color-ink)] transition"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">
                Organization name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Palm Grove Resorts"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">
                Contact name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sarah Jenkins"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] focus:bg-white transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">
                Email address *
              </label>
              <input
                type="email"
                required
                placeholder="admin@palmgrove.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">
                Password *
              </label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] focus:bg-white transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">
                Phone number
              </label>
              <input
                type="tel"
                placeholder="+1 555-0123"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] focus:bg-white transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">
                Planned branches
              </label>
              <select
                value={estimatedProperties}
                onChange={(e) => setEstimatedProperties(Number(e.target.value))}
                className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] focus:bg-white transition"
              >
                <option value={1}>1 branch</option>
                <option value={2}>2 - 3 branches</option>
                <option value={5}>4 - 10 branches</option>
                <option value={15}>10+ branches</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">
              Notes
            </label>
            <textarea
              rows={2}
              placeholder="Tell us about your properties or requirements…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] focus:bg-white transition resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-line)]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-[var(--color-muted)] hover:bg-[var(--color-cream)] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !orgName || !ownerName || !email || !password}
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition"
            >
              {submitting ? 'Submitting…' : 'Submit registration'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
