import { Panel } from '../components/ui/Panel'
import { PageHeader } from '../components/ui/PageHeader'
import { StatCard } from '../components/dashboard/StatCard'
import { useRbac } from '../context/RbacContext'
import { useGuestplace } from '../context/GuestplaceContext'
import { bookingStatusConfig } from '../utils/roomStatus'
import { formatDate, isToday } from '../utils/dates'
import { formatMoney } from '../utils/currency'

export function DashboardPage() {
  const { can } = useRbac()
  const { rooms, bookings, getGuest, getRoom, markRoomReady, settings } = useGuestplace()

  const occupied = rooms.filter((r) => r.status === 'occupied').length
  const available = rooms.filter((r) => r.status === 'available').length
  const cleaningRooms = rooms.filter((r) => r.status === 'cleaning')
  const occupancyRate = rooms.length > 0 ? Math.round((occupied / rooms.length) * 100) : 0

  const activeBookings = bookings.filter(
    (b) => b.status === 'checked_in' || b.status === 'confirmed',
  )
  const todayCheckIns = bookings.filter(
    (b) => isToday(b.checkIn) && (b.status === 'confirmed' || b.status === 'checked_in'),
  )
  const todayCheckOuts = bookings.filter(
    (b) => isToday(b.checkOut) && b.status === 'checked_in',
  )
  const collected = activeBookings.reduce((sum, b) => sum + (b.amountPaid ?? 0), 0)
  const outstanding = activeBookings.reduce(
    (sum, b) => sum + Math.max(0, b.totalAmount - (b.amountPaid ?? 0)),
    0,
  )

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
        <StatCard label="Collected" value={formatMoney(collected)} hint={`${formatMoney(outstanding)} outstanding`} />
      </div>

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
                        Room {room?.number} · until {formatDate(booking.checkOut)}
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
                    <p className="text-xs text-[var(--color-muted)] sm:text-sm">Room {room?.number}</p>
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
