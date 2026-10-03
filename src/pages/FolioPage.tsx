import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { SuggestionForm } from '../components/suggestions/SuggestionForm'
import { loadPublicFolio } from '../lib/operations'
import { markFolioFeedbackSubmitted } from '../lib/suggestions'
import type { PublicFolio } from '../types'
import { formatMoney } from '../utils/currency'
import { formatBookingSchedule } from '../utils/datetime'
import { buildWhatsAppReceiptMessage, openWhatsAppReceipt } from '../utils/receipt'
import type { Booking } from '../types'

export function FolioPage() {
  const { token } = useParams<{ token: string }>()
  const [folio, setFolio] = useState<PublicFolio | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setError('Invalid link')
      setLoading(false)
      return
    }
    loadPublicFolio(token)
      .then((data) => {
        if (!data) setError('Folio not found or expired')
        else setFolio(data)
      })
      .catch(() => setError('Could not load folio'))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--color-cream)]">
        <p className="text-sm text-[var(--color-muted)]">Loading your folio…</p>
      </div>
    )
  }

  if (error || !folio || !token) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--color-cream)] p-6">
        <p className="text-sm text-rose-700">{error ?? 'Not found'}</p>
      </div>
    )
  }

  const schedule: Pick<Booking, 'checkIn' | 'checkOut' | 'checkInTime' | 'checkOutTime'> = {
    checkIn: folio.checkIn,
    checkOut: folio.checkOut,
    checkInTime: folio.checkInTime,
    checkOutTime: folio.checkOutTime,
  }

  const showFeedback =
    folio.checkedOut && folio.suggestionToken && !folio.feedbackSubmitted

  return (
    <div className="min-h-dvh bg-[var(--color-cream)] px-4 py-8">
      <div className="mx-auto max-w-md space-y-4">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-[var(--color-ink)]">{folio.propertyName}</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {folio.checkedOut ? 'Your stay summary' : 'Guest folio'}
          </p>

          <div className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">Guest</span>
              <span className="font-medium">{folio.guestName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">
                {folio.propertyType === 'airbnb' ? 'Unit / Apt' : 'Room'}
              </span>
              <span className="font-medium">
                {folio.propertyType === 'airbnb' ? 'Unit ' : 'Room '}
                {folio.roomNumber}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">Stay</span>
              <span className="font-medium">{formatBookingSchedule(schedule as Booking)}</span>
            </div>
          </div>

          {folio.doorCode && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800 flex items-center justify-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-amber-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 0 1 2 2m4 0a6 6 0 0 1-7.743 5.743L11 17H9v2H7v2H4a1 1 0 0 1-1-1v-2.586a1 1 0 0 1 .293-.707l5.964-5.964A6 6 0 1 1 21 9z" />
                </svg>
                <span>Self Check-in Door / Keybox PIN</span>
              </span>
              <span className="text-xl font-mono font-bold text-amber-950 tracking-widest mt-1 block">
                {folio.doorCode}
              </span>
            </div>
          )}

          <div className="mt-6 rounded-xl bg-[var(--color-cream)] p-4">
            <div className="flex justify-between text-sm">
              <span>{folio.propertyType === 'airbnb' ? 'Apartment charges' : 'Room charges'}</span>
              <span>{formatMoney(folio.baseAmount)}</span>
            </div>
            {folio.cleaningFee ? (
              <div className="mt-1 flex justify-between text-sm text-[var(--color-muted)]">
                <span>Turnover cleaning fee</span>
                <span>{formatMoney(folio.cleaningFee)}</span>
              </div>
            ) : null}
            {folio.extraCharges.map((c) => (
              <div key={c.id} className="mt-1 flex justify-between text-sm text-[var(--color-muted)]">
                <span>{c.description}</span>
                <span>{formatMoney(c.amount)}</span>
              </div>
            ))}
            <div className="mt-3 flex justify-between border-t border-[var(--color-line)] pt-3 font-semibold">
              <span>Total</span>
              <span>{formatMoney(folio.totalAmount)}</span>
            </div>
            <div className="mt-1 flex justify-between text-sm text-emerald-700">
              <span>Paid</span>
              <span>{formatMoney(folio.amountPaid)}</span>
            </div>
            {folio.amountPaid < folio.totalAmount && (
              <div className="mt-1 flex justify-between text-sm text-rose-700">
                <span>Balance due</span>
                <span>{formatMoney(folio.totalAmount - folio.amountPaid)}</span>
              </div>
            )}
            {folio.paymentMethod && (
              <div className="mt-2 pt-2 border-t border-[var(--color-line)] flex justify-between text-xs text-[var(--color-muted)]">
                <span>Payment Method</span>
                <span className="font-medium text-[var(--color-ink)] uppercase">{folio.paymentMethod}</span>
              </div>
            )}
            {folio.paymentReference && (
              <div className="flex justify-between text-xs text-[var(--color-muted)]">
                <span>Ref Number</span>
                <span className="font-mono text-[var(--color-ink)]">{folio.paymentReference}</span>
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2 print:hidden">
            <button
              type="button"
              onClick={() => {
                const balance = Math.max(0, folio.totalAmount - folio.amountPaid)
                const scheduleStr = formatBookingSchedule(schedule as Booking)
                const msg = buildWhatsAppReceiptMessage({
                  propertyName: folio.propertyName,
                  propertyPhone: folio.propertyPhone,
                  guestName: folio.guestName,
                  roomNumber: folio.roomNumber,
                  schedule: scheduleStr,
                  totalAmount: folio.totalAmount,
                  amountPaid: folio.amountPaid,
                  balance,
                  paymentMethod: folio.paymentMethod,
                  paymentReference: folio.paymentReference,
                  wifiPassword: folio.wifiPassword,
                  doorCode: folio.doorCode,
                  propertyType: folio.propertyType,
                })
                openWhatsAppReceipt(undefined, msg)
              }}
              className="flex-1 rounded-xl border border-emerald-600 bg-emerald-50 px-3 py-2 text-center text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition"
            >
              Share via WhatsApp
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-xl border border-[var(--color-line)] bg-white px-4 py-2 text-xs font-medium text-[var(--color-ink)] hover:bg-[var(--color-cream)] transition"
            >
              Print Folio
            </button>
          </div>

          {folio.wifiPassword && !folio.checkedOut && (
            <div className="mt-4 rounded-xl border border-[var(--color-line)] p-4 text-sm">
              <p className="text-[var(--color-muted)]">WiFi password</p>
              <p className="mt-1 font-mono font-medium">{folio.wifiPassword}</p>
            </div>
          )}

          {folio.propertyPhone && (
            <p className="mt-4 text-center text-sm text-[var(--color-muted)]">
              Questions? Call {folio.propertyPhone}
            </p>
          )}
        </div>

        {showFeedback && (
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[var(--color-ink)]">Rate your stay</h2>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              Thanks for staying with us, {folio.guestName}. We'd love your feedback.
            </p>
            <div className="mt-4">
              <SuggestionForm
                token={folio.suggestionToken!}
                propertyId={folio.propertyId}
                propertyName={folio.propertyName}
                defaultName={folio.guestName}
                defaultRoom={folio.roomNumber}
                bookingId={folio.bookingId}
                variant="checkout"
                source="folio"
                onSuccess={() => {
                  markFolioFeedbackSubmitted(token).catch(console.error)
                  setFolio((f) => (f ? { ...f, feedbackSubmitted: true } : f))
                }}
              />
            </div>
          </div>
        )}

        {folio.feedbackSubmitted && (
          <div className="rounded-2xl bg-emerald-50 p-4 text-center text-sm text-emerald-800">
            Thank you — your feedback has been submitted.
          </div>
        )}
      </div>
    </div>
  )
}
