import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { loadPublicFolio } from '../lib/operations'
import type { PublicFolio } from '../types'
import { formatMoney } from '../utils/currency'
import { formatBookingSchedule } from '../utils/datetime'
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

  if (error || !folio) {
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

  return (
    <div className="min-h-dvh bg-[var(--color-cream)] px-4 py-8">
      <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-[var(--color-ink)]">{folio.propertyName}</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">Guest folio</p>

        <div className="mt-6 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--color-muted)]">Guest</span>
            <span className="font-medium">{folio.guestName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--color-muted)]">Room</span>
            <span className="font-medium">{folio.roomNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--color-muted)]">Stay</span>
            <span className="font-medium">{formatBookingSchedule(schedule as Booking)}</span>
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-[var(--color-cream)] p-4">
          <div className="flex justify-between text-sm">
            <span>Room charges</span>
            <span>{formatMoney(folio.baseAmount)}</span>
          </div>
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
        </div>

        {folio.wifiPassword && (
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
    </div>
  )
}
