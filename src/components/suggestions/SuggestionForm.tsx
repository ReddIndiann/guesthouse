import { useState } from 'react'
import { submitGuestSuggestion } from '../../lib/suggestions'

interface SuggestionFormProps {
  token: string
  propertyId: string
  propertyName: string
  defaultName?: string
  defaultRoom?: string
  bookingId?: string
  variant?: 'checkout' | 'general'
  onSuccess?: () => void
  source?: 'checkout' | 'qr' | 'folio'
}

export function SuggestionForm({
  token,
  propertyId,
  propertyName,
  defaultName = '',
  defaultRoom = '',
  bookingId,
  variant = 'general',
  onSuccess,
  source,
}: SuggestionFormProps) {
  const [name, setName] = useState(defaultName)
  const [roomNumber, setRoomNumber] = useState(defaultRoom)
  const [rating, setRating] = useState(0)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const isCheckout = variant === 'checkout'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() && rating === 0) {
      setError('Please leave a rating or write a short comment.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await submitGuestSuggestion({
        token,
        propertyId,
        propertyName,
        name: name || undefined,
        roomNumber: roomNumber || undefined,
        rating: rating || undefined,
        message: message.trim() || (rating ? `Rated ${rating}/5 stars` : ''),
        bookingId,
        source: source ?? (isCheckout ? 'checkout' : 'qr'),
      })
      setSubmitted(true)
      onSuccess?.()
    } catch {
      setError('Could not send your feedback. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="rounded-xl bg-emerald-50 p-6 text-center">
        <p className="text-3xl">✓</p>
        <p className="mt-2 font-medium text-emerald-900">Thank you for your feedback!</p>
        <p className="mt-1 text-sm text-emerald-800">
          {propertyName} appreciates you taking the time.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isCheckout && (
        <p className="text-sm text-[var(--color-muted)]">
          How was your stay? Your rating and comments help us improve.
        </p>
      )}

      {!defaultName && (
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">
            Your name <span className="font-normal text-[var(--color-muted)]">(optional)</span>
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-[var(--color-line)] px-3 py-2.5"
          />
        </label>
      )}

      {!defaultRoom && (
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">
            Room number <span className="font-normal text-[var(--color-muted)]">(optional)</span>
          </span>
          <input
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
            className="rounded-lg border border-[var(--color-line)] px-3 py-2.5"
          />
        </label>
      )}

      <div>
        <p className="mb-2 text-sm font-medium">
          {isCheckout ? 'Rate your stay' : 'Rating'}{' '}
          <span className="font-normal text-[var(--color-muted)]">(optional)</span>
        </p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star === rating ? 0 : star)}
              className={`text-3xl transition-colors ${star <= rating ? 'text-amber-400' : 'text-[var(--color-line)]'}`}
              aria-label={`${star} star${star !== 1 ? 's' : ''}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">
          {isCheckout ? 'Comments' : 'Your suggestion'}{' '}
          <span className="font-normal text-[var(--color-muted)]">(optional if rated)</span>
        </span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder={
            isCheckout
              ? 'What did you enjoy? What could be better?'
              : 'What could we do better? What did you love?'
          }
          className="rounded-lg border border-[var(--color-line)] px-3 py-2.5"
        />
      </label>

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-lg bg-[var(--color-accent)] py-3 text-sm font-medium text-white disabled:opacity-50"
      >
        {submitting ? 'Sending…' : isCheckout ? 'Submit feedback' : 'Send suggestion'}
      </button>
    </form>
  )
}
