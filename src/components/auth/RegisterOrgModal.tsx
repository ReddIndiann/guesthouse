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
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')
  const [estimatedProperties, setEstimatedProperties] = useState<number>(1)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  if (!open) return null

  const handleReset = () => {
    setOrgName('')
    setOwnerName('')
    setEmail('')
    setPhone('')
    setLocation('')
    setEstimatedProperties(1)
    setNotes('')
    setError(null)
    setSubmitted(false)
  }

  const handleClose = () => {
    handleReset()
    onClose()
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      await registerOrganization({
        organizationName: orgName.trim(),
        ownerName: ownerName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        location: location.trim() || undefined,
        estimatedProperties,
        notes: notes.trim() || undefined,
      })

      setSubmitted(true)
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit invitation request. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 sm:p-7 shadow-2xl border border-[var(--color-line)] max-h-[92vh] overflow-y-auto">
        {submitted ? (
          <div className="text-center py-6 space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-7 w-7"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div className="space-y-1.5">
              <h2 className="text-lg font-serif font-bold text-[var(--color-ink)]">
                Invitation Request Submitted
              </h2>
              <p className="text-xs text-[var(--color-muted)] max-w-sm mx-auto">
                Thank you for applying to partner with Guestplace. We have added{' '}
                <strong className="text-[var(--color-ink)]">{orgName}</strong> to our onboarding
                queue.
              </p>
            </div>

            <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-cream)] p-4 text-left text-xs text-[var(--color-muted)] space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-[var(--color-accent)] font-bold text-sm">✓</span>
                <div>
                  <span className="font-semibold text-[var(--color-ink)]">Review & Setup:</span> Our
                  operations team will review your property profile and prepare your workspace.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[var(--color-accent)] font-bold text-sm">✓</span>
                <div>
                  <span className="font-semibold text-[var(--color-ink)]">Invitation Email:</span>{' '}
                  You will receive an official invitation link at{' '}
                  <strong className="text-[var(--color-ink)]">{email}</strong> to set up your team
                  and start co-operating.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="w-full rounded-xl bg-[var(--color-accent)] py-2.5 text-sm font-medium text-white hover:opacity-90 transition shadow-xs"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between pb-4 border-b border-[var(--color-line)]">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent)]/10 px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-accent)] mb-1">
                  Waitlist & Partner Access
                </div>
                <h2 className="text-lg font-serif font-bold text-[var(--color-ink)]">
                  Request an Invitation
                </h2>
                <p className="text-xs text-[var(--color-muted)] mt-0.5">
                  We onboard properties by invitation. Submit your details to join our waitlist.
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
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
                    Organization / Hotel name *
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
                    Contact person *
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
                    Contact email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="admin@palmgrove.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] focus:bg-white transition"
                  />
                  <p className="mt-1 text-[10px] text-[var(--color-muted)]">
                    Invitation link will be dispatched here
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">
                    Phone / WhatsApp number
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +233 24 123 4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] focus:bg-white transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">
                    City / Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Accra, Ghana"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
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
                    <option value={1}>Single location (1 branch)</option>
                    <option value={2}>2 - 3 branches</option>
                    <option value={5}>4 - 10 branches</option>
                    <option value={15}>10+ branches</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">
                  Tell us about your properties & workflow needs
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Number of rooms, current front-desk system, MoMo payment needs, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] focus:bg-white transition resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-line)]">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg px-4 py-2 text-sm text-[var(--color-muted)] hover:bg-[var(--color-cream)] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !orgName || !ownerName || !email}
                  className="rounded-lg bg-[var(--color-accent)] px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition shadow-xs"
                >
                  {submitting ? 'Submitting request…' : 'Join waitlist & request invitation'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
