import { useMemo, useState } from 'react'
import { BookingCalendar } from '../components/bookings/BookingCalendar'
import { BookingReceiptDialog } from '../components/bookings/BookingReceiptDialog'
import { EditBookingDialog } from '../components/bookings/EditBookingDialog'
import { Panel } from '../components/ui/Panel'
import { PageHeader } from '../components/ui/PageHeader'
import { useRbac } from '../context/RbacContext'
import { useGuestplace } from '../context/GuestplaceContext'
import { bookingStatusConfig } from '../utils/roomStatus'
import { paymentStatusConfig } from '../utils/bookings'
import { todayISO } from '../utils/dates'
import { formatBookingSchedule } from '../utils/datetime'
import { formatMoney } from '../utils/currency'
import { formatBookingRateLabel } from '../utils/pricing'
import type { Booking, BookingStatus } from '../types'

type BookingsView = 'list' | 'calendar'
type StatusFilter = BookingStatus | 'all'

export function BookingsPage() {
  const { can } = useRbac()
  const { bookings, getGuest, getRoom, checkIn, checkOut, cancelBooking, updatePayment } =
    useGuestplace()
  const [view, setView] = useState<BookingsView>('list')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [weekStart, setWeekStart] = useState(todayISO())
  const [paymentEdits, setPaymentEdits] = useState<Record<string, string>>({})
  const [receiptBooking, setReceiptBooking] = useState<Booking | null>(null)
  const [editBooking, setEditBooking] = useState<Booking | null>(null)

  const sorted = useMemo(
    () =>
      [...bookings]
        .filter((b) => statusFilter === 'all' || b.status === statusFilter)
        .sort((a, b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime()),
    [bookings, statusFilter],
  )

  const handlePaymentSave = async (bookingId: string, totalAmount: number) => {
    const raw = paymentEdits[bookingId]
    const amountPaid = raw === undefined ? undefined : Number(raw)
    if (amountPaid === undefined || Number.isNaN(amountPaid) || amountPaid < 0) return
    if (amountPaid > totalAmount) return
    await updatePayment(bookingId, amountPaid)
    setPaymentEdits((prev) => {
      const next = { ...prev }
      delete next[bookingId]
      return next
    })
  }

  const statusFilters: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'checked_in', label: 'In house' },
    { value: 'checked_out', label: 'Departed' },
    { value: 'cancelled', label: 'Cancelled' },
  ]

  return (
    <div>
      <PageHeader title="Reservations" subtitle="Reservations and stays" />

      <div className="mb-6 flex flex-wrap gap-2">
        {(['list', 'calendar'] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              view === v
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-white text-[var(--color-muted)]'
            }`}
          >
            {v === 'list' ? 'List' : 'Calendar'}
          </button>
        ))}
      </div>

      {view === 'calendar' ? (
        <BookingCalendar weekStart={weekStart} onWeekChange={setWeekStart} />
      ) : (
        <>
          <div className="scrollbar-none -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
            {statusFilters.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatusFilter(f.value)}
                className={`shrink-0 rounded-full px-3.5 py-2 text-sm transition-colors ${
                  statusFilter === f.value
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-white text-[var(--color-muted)]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {sorted.length === 0 ? (
            <Panel className="py-12 text-center">
              <p className="text-lg font-medium text-[var(--color-ink)]">No bookings yet</p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--color-muted)]">
                Use <strong>+ Book</strong> in the header to create your first reservation.
              </p>
            </Panel>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {sorted.map((booking) => {
                const guest = getGuest(booking.guestId)
                const room = getRoom(booking.roomId)
                const status = bookingStatusConfig[booking.status]
                const payment = paymentStatusConfig[booking.paymentStatus]
                const paymentValue =
                  paymentEdits[booking.id] ?? String(booking.amountPaid ?? 0)

                return (
                  <Panel key={booking.id} className="!p-4 sm:!p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          <p className="truncate font-medium text-[var(--color-ink)]">
                            {guest?.name ?? '—'}
                          </p>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}
                          >
                            {status.label}
                          </span>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${payment.className}`}
                          >
                            {payment.label}
                          </span>
                          {booking.isOverstay && (
                            <span className="shrink-0 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-800">
                              Overstay
                            </span>
                          )}
                        </div>
                        <p className="mt-1 break-words text-sm text-[var(--color-muted)]">
                          Room {room?.number} · {formatBookingRateLabel(booking.rateType, booking.hours)}{' '}
                          · {formatBookingSchedule(booking)}
                        </p>
                        <p className="mt-1 text-sm font-medium text-[var(--color-ink)]">
                          {formatMoney(booking.totalAmount)}
                          {booking.amountPaid > 0 && booking.paymentStatus !== 'paid' && (
                            <span className="ml-2 font-normal text-[var(--color-muted)]">
                              ({formatMoney(booking.amountPaid)} paid)
                            </span>
                          )}
                        </p>

                        {can('bookings.create') &&
                          (booking.status === 'confirmed' || booking.status === 'checked_in') && (
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <label className="text-xs text-[var(--color-muted)]">
                                Paid (₵)
                                <input
                                  type="number"
                                  min={0}
                                  max={booking.totalAmount}
                                  value={paymentValue}
                                  onChange={(e) =>
                                    setPaymentEdits((prev) => ({
                                      ...prev,
                                      [booking.id]: e.target.value,
                                    }))
                                  }
                                  className="ml-2 w-24 rounded-lg border border-[var(--color-line)] px-2 py-1 text-sm"
                                />
                              </label>
                              {paymentEdits[booking.id] !== undefined && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handlePaymentSave(booking.id, booking.totalAmount)
                                  }
                                  className="rounded-lg bg-[var(--color-accent)] px-3 py-1 text-xs font-medium text-white"
                                >
                                  Save payment
                                </button>
                              )}
                            </div>
                          )}
                      </div>

                      {(can('bookings.checkin') ||
                        can('bookings.cancel') ||
                        can('bookings.checkout') ||
                        can('bookings.update')) && (
                        <div className="flex flex-col gap-2 sm:flex-row sm:shrink-0 md:flex-col lg:flex-row">
                          <button
                            type="button"
                            onClick={() => setReceiptBooking(booking)}
                            className="w-full rounded-lg border border-[var(--color-line)] px-4 py-2.5 text-sm font-medium text-[var(--color-ink)] active:scale-[0.98] sm:w-auto sm:py-1.5"
                          >
                            Receipt
                          </button>
                          {can('bookings.update') &&
                            (booking.status === 'confirmed' || booking.status === 'checked_in') && (
                              <button
                                type="button"
                                onClick={() => setEditBooking(booking)}
                                className="w-full rounded-lg border border-[var(--color-line)] px-4 py-2.5 text-sm font-medium text-[var(--color-ink)] active:scale-[0.98] sm:w-auto sm:py-1.5"
                              >
                                Amend
                              </button>
                            )}
                          {booking.status === 'confirmed' && can('bookings.checkin') && (
                            <button
                              type="button"
                              onClick={() => checkIn(booking.id)}
                              className="w-full rounded-lg bg-[var(--color-accent)] px-4 py-2.5 text-sm font-medium text-white active:scale-[0.98] sm:w-auto sm:py-1.5"
                            >
                              Check in
                            </button>
                          )}
                          {booking.status === 'confirmed' && can('bookings.cancel') && (
                            <button
                              type="button"
                              onClick={() => cancelBooking(booking.id)}
                              className="w-full rounded-lg px-4 py-2.5 text-sm text-[var(--color-muted)] active:scale-[0.98] sm:w-auto sm:py-1.5"
                            >
                              Cancel
                            </button>
                          )}
                          {booking.status === 'checked_in' && can('bookings.checkout') && (
                            <button
                              type="button"
                              onClick={() => checkOut(booking.id)}
                              className="w-full rounded-lg border border-[var(--color-line)] px-4 py-2.5 text-sm font-medium text-[var(--color-ink)] active:scale-[0.98] sm:w-auto sm:py-1.5"
                            >
                              Check out
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </Panel>
                )
              })}
            </div>
          )}
        </>
      )}

      <BookingReceiptDialog
        booking={receiptBooking}
        open={!!receiptBooking}
        onClose={() => setReceiptBooking(null)}
      />
      <EditBookingDialog
        booking={editBooking}
        open={!!editBooking}
        onClose={() => setEditBooking(null)}
      />
    </div>
  )
}
