import { useState, type FormEvent } from 'react'
import { registerOrganization } from '../../lib/tenants'

interface RegisterOrgModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

type PropertyType = 'hotel' | 'guesthouse' | 'airbnb' | 'resort'

const PROPERTY_TYPES: { id: PropertyType; label: string; icon: string; desc: string }[] = [
  { id: 'hotel', label: 'Hotel / Boutique', icon: '🏨', desc: 'Front desk, rooms & amenities' },
  { id: 'guesthouse', label: 'Guest House / Lodge', icon: '🏡', desc: 'Walk-ins, shifts & room rates' },
  { id: 'airbnb', label: 'Airbnb / Apartments', icon: '🔑', desc: 'Short-stays, units & key handoff' },
  { id: 'resort', label: 'Resort / Retreat', icon: '🌴', desc: 'Villas, leisure & grounds' },
]

export function RegisterOrgModal({ open, onClose, onSuccess }: RegisterOrgModalProps) {
  const [orgName, setOrgName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')
  const [propertyType, setPropertyType] = useState<PropertyType>('guesthouse')
  const [unitsRange, setUnitsRange] = useState('6 - 15 rooms / units')
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
    setPropertyType('guesthouse')
    setUnitsRange('6 - 15 rooms / units')
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
        propertyType,
        unitsRange,
        estimatedProperties,
        notes: notes.trim() || undefined,
      })

      setSubmitted(true)
      onSuccess?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit property details. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 sm:p-7 shadow-2xl border border-[var(--color-line)] max-h-[94vh] overflow-y-auto">
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
                Property Details Received!
              </h2>
              <p className="text-xs text-[var(--color-muted)] max-w-md mx-auto">
                Thank you for connecting with us! We have received the details for{' '}
                <strong className="text-[var(--color-ink)]">{orgName}</strong>.
              </p>
            </div>

            <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-cream)] p-4 text-left text-xs text-[var(--color-muted)] space-y-2.5">
              <div className="flex items-start gap-2.5">
                <span className="text-[var(--color-accent)] font-bold text-sm leading-none mt-0.5">✓</span>
                <div>
                  <span className="font-semibold text-[var(--color-ink)]">Custom Setup:</span> We are
                  configuring your workspace tailored for your{' '}
                  <span className="capitalize font-semibold text-[var(--color-ink)]">
                    {PROPERTY_TYPES.find((p) => p.id === propertyType)?.label || propertyType}
                  </span>{' '}
                  ({unitsRange}).
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="text-[var(--color-accent)] font-bold text-sm leading-none mt-0.5">✓</span>
                <div>
                  <span className="font-semibold text-[var(--color-ink)]">Onboarding Access:</span>{' '}
                  We will contact you at{' '}
                  <strong className="text-[var(--color-ink)]">{email}</strong> with your setup link
                  so you can begin managing reservations, guest folios, and daily operations.
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
                  Hotels · Guest Houses · Airbnbs
                </div>
                <h2 className="text-lg font-serif font-bold text-[var(--color-ink)]">
                  Get your property on Guestplace
                </h2>
                <p className="text-xs text-[var(--color-muted)] mt-0.5">
                  Built for hotel managers, guest house owners, and short-stay Airbnb hosts.
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

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* Property Category Selection */}
              <div>
                <label className="block text-xs font-medium text-[var(--color-muted)] mb-1.5">
                  Property Category *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PROPERTY_TYPES.map((type) => {
                    const isSelected = propertyType === type.id
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setPropertyType(type.id)}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition ${
                          isSelected
                            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-ink)] font-semibold shadow-xs'
                            : 'border-[var(--color-line)] bg-[var(--color-cream)]/70 text-[var(--color-muted)] hover:border-[var(--color-muted)]/50'
                        }`}
                      >
                        <span className="text-lg mb-1">{type.icon}</span>
                        <span className="text-xs leading-tight">{type.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">
                    Property / Business name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={
                      propertyType === 'airbnb'
                        ? 'e.g. Cantonments Luxury Suites'
                        : propertyType === 'hotel'
                          ? 'e.g. Royal Crown Hotel'
                          : 'e.g. Palm Grove Guest House'
                    }
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">
                    Contact person / Host *
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

              {/* Contacts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">
                    Contact email *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="manager@myproperty.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] focus:bg-white transition"
                  />
                  <p className="mt-1 text-[10px] text-[var(--color-muted)]">
                    Setup instructions & access details will be sent here
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

              {/* Location, Units & Branches */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">
                    City / Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Accra, East Legon"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">
                    Rooms / Units count
                  </label>
                  <select
                    value={unitsRange}
                    onChange={(e) => setUnitsRange(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] focus:bg-white transition"
                  >
                    <option value="1 - 5 units (e.g. Airbnb / compact)">1 – 5 rooms / units</option>
                    <option value="6 - 15 rooms / units">6 – 15 rooms / units</option>
                    <option value="16 - 30 rooms / units">16 – 30 rooms / units</option>
                    <option value="31 - 60 rooms / units">31 – 60 rooms / units</option>
                    <option value="60+ rooms / units">60+ rooms / units</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">
                    Locations / Branches
                  </label>
                  <select
                    value={estimatedProperties}
                    onChange={(e) => setEstimatedProperties(Number(e.target.value))}
                    className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] focus:bg-white transition"
                  >
                    <option value={1}>Single location</option>
                    <option value={2}>2 – 3 locations</option>
                    <option value={5}>4 – 10 locations</option>
                    <option value={15}>10+ locations</option>
                  </select>
                </div>
              </div>

              {/* Operational Needs */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-[var(--color-muted)]">
                    Tell us about your properties & workflow needs
                  </label>
                  <span className="text-[10px] text-[var(--color-muted)]">Front desk, payments, cleaning</span>
                </div>
                <textarea
                  rows={4}
                  placeholder={
                    propertyType === 'airbnb'
                      ? 'e.g. 3 furnished apartments in Cantonments, looking for calendar sync, check-in code delivery, MoMo payments, and housekeeping turnover tracking…'
                      : propertyType === 'hotel'
                        ? 'e.g. 25 hotel rooms (executive suites & standard), 24/7 front desk shifts, MoMo / card POS receipts, and guest dining folios…'
                        : 'e.g. 14 guest rooms (AC & Non-AC hourly/daily rates), front-desk receipt printing, daily cash drawer reconciliation, and shift handovers…'
                  }
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full min-h-[105px] rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] p-3 text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] focus:bg-white transition resize-y leading-relaxed"
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
                  className="rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition shadow-xs"
                >
                  {submitting ? 'Submitting details…' : 'Submit property details'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
