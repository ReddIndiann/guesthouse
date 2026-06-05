import { useMemo, useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { useGuestplace } from '../context/GuestplaceContext'
import { useOperations } from '../context/OperationsContext'
import {
  buildPeriodAnalytics,
  monthStartFrom,
  weekStartFrom,
} from '../utils/analytics'
import { todayISO } from '../utils/dates'
import { formatMoney } from '../utils/currency'
import { rateTypeReportLabel } from '../utils/reports'
import type { BookingRateType } from '../types'

type Period = 'week' | 'month'

export function ReportsPage() {
  const { rooms, bookings, getRoom } = useGuestplace()
  const { nightAudits, activityLog } = useOperations()
  const [period, setPeriod] = useState<Period>('week')
  const [showAudit, setShowAudit] = useState(false)

  const today = todayISO()
  const startDate = period === 'week' ? weekStartFrom(today) : monthStartFrom(today)

  const analytics = useMemo(
    () =>
      buildPeriodAnalytics(
        bookings,
        rooms,
        (id) => getRoom(id)?.number ?? '—',
        startDate,
        today,
      ),
    [bookings, rooms, getRoom, startDate, today],
  )

  const rateTypes: BookingRateType[] = ['full_day', 'two_hours', 'per_hour']

  return (
    <div>
      <PageHeader title="Reports" subtitle="Revenue analytics and night audits" />

      <div className="mb-6 flex flex-wrap gap-2">
        {(['week', 'month'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              period === p
                ? 'bg-[var(--color-accent)] text-white'
                : 'bg-white text-[var(--color-muted)]'
            }`}
          >
            This {p}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowAudit((v) => !v)}
          className="rounded-full bg-white px-4 py-2 text-sm text-[var(--color-muted)]"
        >
          {showAudit ? 'Hide' : 'Show'} activity log
        </button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Panel className="!p-4 text-center">
          <p className="text-xs text-[var(--color-muted)]">Occupancy</p>
          <p className="text-xl font-semibold">{analytics.occupancyPercent}%</p>
        </Panel>
        <Panel className="!p-4 text-center">
          <p className="text-xs text-[var(--color-muted)]">Revenue</p>
          <p className="text-xl font-semibold">{formatMoney(analytics.totalRevenue)}</p>
        </Panel>
        <Panel className="!p-4 text-center">
          <p className="text-xs text-[var(--color-muted)]">Collected</p>
          <p className="text-xl font-semibold">{formatMoney(analytics.collectedRevenue)}</p>
        </Panel>
        <Panel className="!p-4 text-center">
          <p className="text-xs text-[var(--color-muted)]">Avg stay</p>
          <p className="text-xl font-semibold">{analytics.averageStayHours}h</p>
        </Panel>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        <Panel>
          <h2 className="mb-3 text-sm font-medium">Revenue by rate type</h2>
          {rateTypes.map((type) => {
            const row = analytics.byRateType[type]
            if (row.count === 0) return null
            return (
              <div key={type} className="mb-2 flex justify-between text-sm">
                <span>{rateTypeReportLabel(type)}</span>
                <span>
                  {row.count} stays · {formatMoney(row.revenue)}
                </span>
              </div>
            )
          })}
          {analytics.bookingCount === 0 && (
            <p className="text-sm text-[var(--color-muted)]">No bookings in this period.</p>
          )}
        </Panel>

        <Panel>
          <h2 className="mb-3 text-sm font-medium">Top rooms</h2>
          {analytics.topRooms.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">No data yet.</p>
          ) : (
            <ul className="space-y-2">
              {analytics.topRooms.map((r) => (
                <li key={r.roomId} className="flex justify-between text-sm">
                  <span>Room {r.roomNumber}</span>
                  <span>
                    {formatMoney(r.revenue)} · {r.stays} stays
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel className="mb-6">
        <h2 className="mb-3 text-sm font-medium">Night audit history</h2>
        {nightAudits.length === 0 ? (
          <p className="text-sm text-[var(--color-muted)]">
            Night audits run automatically after 1 AM. They auto-checkout expired stays, flag
            overstays, and snapshot occupancy.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--color-line)]">
            {nightAudits.slice(0, 10).map((audit) => (
              <li key={audit.id} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
                <span className="font-medium">{audit.date}</span>
                <span className="text-[var(--color-muted)]">
                  {audit.occupancyPercent}% occupied · {audit.checkedOutCount} auto check-outs ·{' '}
                  {audit.overstayCount} overstays · {formatMoney(audit.revenueToday)} revenue
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {showAudit && (
        <Panel>
          <h2 className="mb-3 text-sm font-medium">Activity log</h2>
          {activityLog.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">No activity recorded yet.</p>
          ) : (
            <ul className="max-h-96 divide-y divide-[var(--color-line)] overflow-y-auto">
              {activityLog.map((entry) => (
                <li key={entry.id} className="py-2 text-sm">
                  <span className="font-medium">{entry.performedByName}</span>
                  <span className="text-[var(--color-muted)]">
                    {' '}
                    · {entry.action.replace(/_/g, ' ')}
                    {entry.details ? ` — ${entry.details}` : ''}
                  </span>
                  <p className="text-xs text-[var(--color-muted)]">
                    {new Date(entry.createdAt).toLocaleString('en-GH')}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </div>
  )
}
