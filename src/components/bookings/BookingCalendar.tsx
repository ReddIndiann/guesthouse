import { useMemo } from 'react'
import { useGuestplace } from '../../context/GuestplaceContext'
import { bookingStatusConfig } from '../../utils/roomStatus'
import {
  addDaysISO,
  formatShortDate,
  formatWeekday,
  getWeekDates,
  isDateInRange,
  todayISO,
} from '../../utils/dates'
import type { Booking } from '../../types'

interface BookingCalendarProps {
  weekStart?: string
  onWeekChange?: (start: string) => void
}

function bookingForCell(bookings: Booking[], roomId: string, date: string) {
  return bookings.find(
    (b) =>
      b.roomId === roomId &&
      (b.status === 'confirmed' || b.status === 'checked_in') &&
      isDateInRange(date, b.checkIn, b.checkOut),
  )
}

export function BookingCalendar({ weekStart, onWeekChange }: BookingCalendarProps) {
  const { rooms, bookings, getGuest } = useGuestplace()
  const start = weekStart ?? todayISO()
  const dates = useMemo(() => getWeekDates(start, 7), [start])

  const sortedRooms = useMemo(
    () => [...rooms].sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true })),
    [rooms],
  )

  if (rooms.length === 0) {
    return (
      <p className="rounded-2xl bg-white p-8 text-center text-sm text-[var(--color-muted)] shadow-[0_1px_2px_rgba(26,24,20,0.04)]">
        Add rooms to see the calendar.
      </p>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(26,24,20,0.04)]">
      <div className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-3">
        <button
          type="button"
          onClick={() => onWeekChange?.(addDaysISO(start, -7))}
          className="rounded-lg px-3 py-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]"
        >
          ← Prev
        </button>
        <p className="text-sm font-medium">
          {formatShortDate(dates[0])} – {formatShortDate(dates[6])}
        </p>
        <button
          type="button"
          onClick={() => onWeekChange?.(addDaysISO(start, 7))}
          className="rounded-lg px-3 py-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-ink)]"
        >
          Next →
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[640px] w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--color-line)] bg-[var(--color-cream)]">
              <th className="sticky left-0 z-10 bg-[var(--color-cream)] px-3 py-2 text-left text-xs font-medium text-[var(--color-muted)]">
                Room
              </th>
              {dates.map((date) => (
                <th
                  key={date}
                  className={`min-w-[72px] px-2 py-2 text-center text-xs font-medium ${
                    date === todayISO() ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'
                  }`}
                >
                  <div>{formatWeekday(date)}</div>
                  <div>{formatShortDate(date)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRooms.map((room) => (
              <tr key={room.id} className="border-b border-[var(--color-line)] last:border-0">
                <td className="sticky left-0 z-10 bg-white px-3 py-2 font-medium">{room.number}</td>
                {dates.map((date) => {
                  const booking = bookingForCell(bookings, room.id, date)
                  const guest = booking ? getGuest(booking.guestId) : undefined
                  const isStart = booking?.checkIn === date

                  return (
                    <td key={date} className="px-1 py-1 align-top">
                      {booking && isStart ? (
                        <div
                          className={`rounded-lg px-1.5 py-1 text-[10px] leading-tight sm:text-xs ${
                            bookingStatusConfig[booking.status].className
                          }`}
                          title={guest?.name}
                        >
                          <span className="line-clamp-2 font-medium">{guest?.name ?? '—'}</span>
                        </div>
                      ) : booking ? (
                        <div className="h-full min-h-[28px] rounded bg-stone-100/80" />
                      ) : null}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
