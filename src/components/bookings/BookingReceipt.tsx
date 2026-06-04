import type { Booking, Guest, PropertySettings, Room } from '../../types'
import { formatMoney } from '../../utils/currency'
import { formatBookingSchedule } from '../../utils/datetime'
import { formatBookingRateLabel } from '../../utils/pricing'

interface BookingReceiptProps {
  settings: PropertySettings
  booking: Booking
  guest: Guest | undefined
  room: Room | undefined
}

export function BookingReceipt({ settings, booking, guest, room }: BookingReceiptProps) {
  const balance = Math.max(0, booking.totalAmount - booking.amountPaid)

  return (
    <div className="receipt-root mx-auto max-w-sm bg-white p-6 text-[var(--color-ink)]">
      <div className="border-b border-dashed border-[var(--color-line)] pb-4 text-center">
        <h1 className="text-lg font-semibold">{settings.name || 'Guestplace'}</h1>
        {settings.address && <p className="mt-1 text-xs text-[var(--color-muted)]">{settings.address}</p>}
        {settings.phone && <p className="text-xs text-[var(--color-muted)]">{settings.phone}</p>}
        <p className="mt-2 text-xs text-[var(--color-muted)]">
          {new Date().toLocaleString('en-GH', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--color-muted)]">Guest</dt>
          <dd className="font-medium text-right">{guest?.name ?? '—'}</dd>
        </div>
        {guest?.phone && (
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--color-muted)]">Phone</dt>
            <dd className="text-right">{guest.phone}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--color-muted)]">Room</dt>
          <dd className="font-medium text-right">{room?.number ?? '—'}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--color-muted)]">Stay</dt>
          <dd className="text-right">{formatBookingRateLabel(booking.rateType, booking.hours)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--color-muted)]">Schedule</dt>
          <dd className="text-right text-xs">{formatBookingSchedule(booking)}</dd>
        </div>
      </dl>

      <div className="mt-4 border-t border-dashed border-[var(--color-line)] pt-4 space-y-1 text-sm">
        <div className="flex justify-between">
          <span>Total</span>
          <span className="font-semibold">{formatMoney(booking.totalAmount)}</span>
        </div>
        <div className="flex justify-between">
          <span>Paid</span>
          <span>{formatMoney(booking.amountPaid)}</span>
        </div>
        {balance > 0 && (
          <div className="flex justify-between font-medium text-rose-700">
            <span>Balance due</span>
            <span>{formatMoney(balance)}</span>
          </div>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-[var(--color-muted)]">Thank you for staying with us</p>
    </div>
  )
}

export function printBookingReceipt() {
  window.print()
}
