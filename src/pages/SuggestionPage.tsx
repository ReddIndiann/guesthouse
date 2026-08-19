import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { SuggestionForm } from '../components/suggestions/SuggestionForm'
import { loadPublicSuggestionForm } from '../lib/suggestions'
import type { PublicSuggestionForm } from '../types'

export function SuggestionPage() {
  const { token } = useParams<{ token: string }>()
  const [searchParams] = useSearchParams()
  const [form, setForm] = useState<PublicSuggestionForm | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const guestName = searchParams.get('name') ?? ''
  const roomNumber = searchParams.get('room') ?? ''
  const bookingId = searchParams.get('booking') ?? undefined
  const isCheckout = searchParams.get('checkout') === '1' || !!bookingId

  useEffect(() => {
    if (!token) {
      setError('Invalid link')
      setLoading(false)
      return
    }
    loadPublicSuggestionForm(token)
      .then((data) => {
        if (!data) setError('Suggestion form not found')
        else setForm(data)
      })
      .catch(() => setError('Could not load form'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--color-cream)]">
        <p className="text-sm text-[var(--color-muted)]">Loading…</p>
      </div>
    )
  }

  if (error || !form || !token) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--color-cream)] p-6">
        <p className="text-sm text-rose-700">{error ?? 'Not found'}</p>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-[var(--color-cream)] px-4 py-8">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-[var(--color-ink)]">{form.propertyName}</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          {isCheckout
            ? guestName
              ? `Thanks for staying, ${guestName}!`
              : 'Thanks for staying with us!'
            : 'Share a suggestion or feedback — we read every one.'}
        </p>

        {isCheckout && roomNumber && (
          <p className="mt-2 text-sm text-[var(--color-muted)]">Room {roomNumber}</p>
        )}

        <div className="mt-6">
          <SuggestionForm
            token={token}
            propertyId={form.propertyId}
            propertyName={form.propertyName}
            defaultName={guestName}
            defaultRoom={roomNumber}
            bookingId={bookingId}
            variant={isCheckout ? 'checkout' : 'general'}
          />
        </div>
      </div>
    </div>
  )
}
