import { useMemo } from 'react'
import { Panel } from '../components/ui/Panel'
import { PageHeader } from '../components/ui/PageHeader'
import { StatCard } from '../components/dashboard/StatCard'
import { useRbac } from '../context/RbacContext'
import { useGuestplace } from '../context/GuestplaceContext'
import { bookingStatusConfig } from '../utils/roomStatus'
import { isToday } from '../utils/dates'
import { formatMoney } from '../utils/currency'
import { isBookingEndingSoon, formatBookingSchedule } from '../utils/datetime'
import { buildTodayCashReport, rateTypeReportLabel } from '../utils/reports'
import type { BookingRateType } from '../types'

export function DashboardPage() {
  const { can } = useRbac()
  const { rooms, bookings, getGuest, getRoom, markRoomReady, settings } = useGuestplace()

  const occupied = rooms.filter((r) => r.status === 'occupied').length
  const available = rooms.filter((r) => r.status === 'available').length
  const cleaningRooms = rooms.filter((r) => r.status === 'cleaning')
  const occupancyRate = rooms.length > 0 ? Math.round((occupied / rooms.length) * 100) : 0

  const todayCheckIns = bookings.filter(
    (b) => isToday(b.checkIn) && (b.status === 'confirmed' || b.status === 'checked_in'),
  )
  const todayCheckOuts = bookings.filter(
    (b) => isToday(b.checkOut) && b.status === 'checked_in',
  )
  const endingSoon = bookings.filter(
    (b) => b.status === 'checked_in' && isBookingEndingSoon(b, 45),
  )

  const cashReport = useMemo(
    () =>
      buildTodayCashReport(
        bookings,
        (id) => getGuest(id)?.name ?? '—',
        (id) => getRoom(id)?.number ?? '—',
      ),
    [bookings, getGuest, getRoom],
  )

  const rateTypes: BookingRateType[] = ['full_day', 'two_hours', 'per_hour']

  return (
    <div>
      <PageHeader
        title="Today"
        subtitle={settings.name || 'A quick look at your guest house'}
      />

      <div className="mb-6 grid grid-cols-2 gap-2 sm:mb-8 sm:gap-3 md:grid-cols-4 lg:mb-10">
        <StatCard label="Occupancy" value={`${occupancyRate}%`} hint={`${occupied} of ${rooms.length} rooms`} />
        <StatCard label="Free" value={available} hint="Ready now" />
        <StatCard label="Arriving" value={todayCheckIns.length} hint="Check-ins today" />
        <StatCard
          label="Today's cash"
          value={formatMoney(cashReport.totalCollected)}
          hint={`${formatMoney(cashReport.outstanding)} still due`}
        />
      </div>

      {endingSoon.length > 0 && (
        <Panel className="mb-6 border-amber-200 bg-amber-50/80">
          <h2 className="mb-2 text-sm font-medium text-amber-900">Ending soon</h2>
          <ul className="space-y-2">
            {endingSoon.map((booking) => {
              const guest = getGuest(booking.guestId)
              const room = getRoom(booking.roomId)
              return (
                <li key={booking.id} className="text-sm text-amber-900">
                  Room {room?.number} · {guest?.name} · {formatBookingSchedule(booking)}
                </li>
              )
            })}
          </ul>
        </Panel>
      )}

      <Panel className="mb-6">
        <h2 className="mb-3 text-sm font-medium text-[var(--color-ink)]">Today's cash report</h2>
        <div className="mb-4 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-[var(--color-cream)] px-2 py-3">
            <p className="text-xs text-[var(--color-muted)]">Billed</p>
            <p className="text-sm font-semibold">{formatMoney(cashReport.totalBilled)}</p>
          </div>
          <div className="rounded-lg bg-emerald-50 px-2 py-3">
            <p className="text-xs text-emerald-800">Collected</p>
            <p className="text-sm font-semibold text-emerald-900">
              {formatMoney(cashReport.totalCollected)}
            </p>
          </div>
          <div className="rounded-lg bg-rose-50 px-2 py-3">
            <p className="text-xs text-rose-800">Due</p>
            <p className="text-sm font-semibold text-rose-900">
              {formatMoney(cashReport.outstanding)}
            </p>
          </div>
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          {rateTypes.map((type) => {
            const row = cashReport.byRateType[type]
            if (row.count === 0) return null
            return (
              <span
                key={type}
                className="rounded-full bg-[var(--color-cream)] px-3 py-1 text-xs text-[var(--color-muted)]"
              >
                {rateTypeReportLabel(type)}: {row.count} · {formatMoney(row.collected)} collected
              </span>
            )
          })}
        </div>
        {cashReport.lines.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">No walk-ins or check-ins yet today.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-line)]">
            {cashReport.lines.map((line) => (
              <li
                key={line.bookingId}
                className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm first:pt-0 last:pb-0"
              >
                <span className="text-[var(--color-ink)]">
                  Room {line.roomNumber} · {line.guestName}
                </span>
                <span className="text-[var(--color-muted)]">
                  {formatMoney(line.amountPaid)} / {formatMoney(line.totalAmount)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {cleaningRooms.length > 0 && can('rooms.updateStatus') && (
        <Panel className="mb-6">
          <h2 className="mb-3 text-sm font-medium text-[var(--color-ink)]">Housekeeping</h2>
          <p className="mb-3 text-sm text-[var(--color-muted)]">
            {cleaningRooms.length} room{cleaningRooms.length !== 1 ? 's' : ''} need to be marked ready.
          </p>
          <ul className="flex flex-wrap gap-2">
            {cleaningRooms.map((room) => (
              <li key={room.id}>
                <button
                  type="button"
                  onClick={() => markRoomReady(room.id)}
                  className="rounded-lg border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-medium"
                >
                  Room {room.number} · Mark ready
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <Panel>
          <h2 className="mb-3 text-sm font-medium text-[var(--color-ink)] sm:mb-4">Arrivals</h2>
          {todayCheckIns.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">Nothing scheduled today.</p>
          ) : (
            <ul className="divide-y divide-[var(--color-line)]">
              {todayCheckIns.map((booking) => {
                const guest = getGuest(booking.guestId)
                const room = getRoom(booking.roomId)
                const status = bookingStatusConfig[booking.status]
                return (
                  <li
                    key={booking.id}
                    className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 min-[400px]:flex-row min-[400px]:items-center min-[400px]:justify-between min-[400px]:gap-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--color-ink)]">{guest?.name}</p>
                      <p className="text-xs text-[var(--color-muted)] sm:text-sm">
                        Room {room?.number} · {formatBookingSchedule(booking)}
                      </p>
                    </div>
                    <span
                      className={`w-fit shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <Panel>
          <h2 className="mb-3 text-sm font-medium text-[var(--color-ink)] sm:mb-4">Departures</h2>
          {todayCheckOuts.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">No departures today.</p>
          ) : (
            <ul className="divide-y divide-[var(--color-line)]">
              {todayCheckOuts.map((booking) => {
                const guest = getGuest(booking.guestId)
                const room = getRoom(booking.roomId)
                return (
                  <li key={booking.id} className="py-3 first:pt-0 last:pb-0">
                    <p className="truncate font-medium text-[var(--color-ink)]">{guest?.name}</p>
                    <p className="text-xs text-[var(--color-muted)] sm:text-sm">
                      Room {room?.number} · {formatBookingSchedule(booking)}
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}
