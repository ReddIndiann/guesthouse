import { useMemo, useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { useGuestplace } from '../context/GuestplaceContext'
import { useOperations } from '../context/OperationsContext'
import { ShiftHandoverModal } from '../components/operations/ShiftHandoverModal'
import { LogExpenseModal } from '../components/operations/LogExpenseModal'
import {
  buildPeriodAnalytics,
  monthStartFrom,
  weekStartFrom,
} from '../utils/analytics'
import { todayISO } from '../utils/dates'
import { formatMoney } from '../utils/currency'
import { rateTypeReportLabel } from '../utils/reports'
import type { BookingRateType, ExpenseCategory } from '../types'

type Period = 'week' | 'month'
type ReportTab = 'revenue' | 'shifts' | 'expenses'

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  generator_fuel: 'Generator Fuel',
  ecg_electricity: 'ECG Electricity',
  water_supply: 'Water Supply',
  cleaning_supplies: 'Cleaning Supplies',
  maintenance: 'Maintenance',
  food_beverage: 'Food & Beverage',
  staff_welfare: 'Staff Welfare',
  other: 'Other Expense',
}

export function ReportsPage() {
  const { rooms, bookings, getRoom } = useGuestplace()
  const { nightAudits, activityLog, shifts, activeShift, expenses, removeExpense } = useOperations()
  const [tab, setTab] = useState<ReportTab>('revenue')
  const [period, setPeriod] = useState<Period>('week')
  const [showAudit, setShowAudit] = useState(false)
  const [shiftModalOpen, setShiftModalOpen] = useState(false)
  const [expenseModalOpen, setExpenseModalOpen] = useState(false)

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

  // Filter expenses by selected period
  const periodExpenses = useMemo(() => {
    return expenses.filter((e) => e.date >= startDate && e.date <= today)
  }, [expenses, startDate, today])

  const totalExpenseAmount = useMemo(() => {
    return periodExpenses.reduce((sum, e) => sum + e.amount, 0)
  }, [periodExpenses])

  const netOperatingIncome = analytics.totalRevenue - totalExpenseAmount

  // Category breakdown for expenses
  const expensesByCategory = useMemo(() => {
    const map: Partial<Record<ExpenseCategory, number>> = {}
    periodExpenses.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + e.amount
    })
    return Object.entries(map).sort((a, b) => (b[1] || 0) - (a[1] || 0)) as [ExpenseCategory, number][]
  }, [periodExpenses])

  const rateTypes: BookingRateType[] = ['full_day', 'two_hours', 'per_hour']

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <PageHeader title="Financial & Operational Reports" subtitle="Revenue, shift cash reconciliation, and branch expenses" />
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShiftModalOpen(true)}
            className="rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-xs font-semibold text-[var(--color-ink)] hover:bg-[var(--color-cream)] transition shadow-sm flex items-center gap-1.5"
          >
            <span>💰</span>
            <span>{activeShift ? 'Active Shift Drawer' : 'Start Shift'}</span>
          </button>
          <button
            type="button"
            onClick={() => setExpenseModalOpen(true)}
            className="rounded-lg bg-[var(--color-accent)] px-3.5 py-2 text-xs font-semibold text-white hover:opacity-95 transition shadow-sm flex items-center gap-1.5"
          >
            <span>+</span>
            <span>Log Expense</span>
          </button>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="mb-6 flex border-b border-[var(--color-line)]">
        {[
          { id: 'revenue', label: 'Revenue & Occupancy' },
          { id: 'shifts', label: 'Shift Handover & Drawer' },
          { id: 'expenses', label: 'Petty Cash & Expenses' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id as ReportTab)}
            className={`border-b-2 px-4 py-3 text-sm font-medium transition ${
              tab === t.id
                ? 'border-[var(--color-accent)] text-[var(--color-accent)] font-semibold'
                : 'border-transparent text-[var(--color-muted)] hover:text-[var(--color-ink)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: REVENUE & NIGHT AUDIT */}
      {tab === 'revenue' && (
        <>
          <div className="mb-6 flex flex-wrap gap-2">
            {(['week', 'month'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                  period === p
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-white text-[var(--color-muted)] border border-[var(--color-line)]'
                }`}
              >
                This {p}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowAudit((v) => !v)}
              className="rounded-full bg-white px-4 py-1.5 text-xs text-[var(--color-muted)] border border-[var(--color-line)]"
            >
              {showAudit ? 'Hide' : 'Show'} activity log
            </button>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Panel className="!p-4 text-center">
              <p className="text-xs text-[var(--color-muted)]">Occupancy</p>
              <p className="text-xl font-semibold mt-1">{analytics.occupancyPercent}%</p>
            </Panel>
            <Panel className="!p-4 text-center">
              <p className="text-xs text-[var(--color-muted)]">Gross Revenue</p>
              <p className="text-xl font-semibold text-emerald-800 mt-1">{formatMoney(analytics.totalRevenue)}</p>
            </Panel>
            <Panel className="!p-4 text-center">
              <p className="text-xs text-[var(--color-muted)]">Total Expenses</p>
              <p className="text-xl font-semibold text-rose-700 mt-1">{formatMoney(totalExpenseAmount)}</p>
            </Panel>
            <Panel className="!p-4 text-center">
              <p className="text-xs text-[var(--color-muted)]">Net Operating Profit</p>
              <p className={`text-xl font-bold mt-1 ${netOperatingIncome >= 0 ? 'text-emerald-800' : 'text-rose-700'}`}>
                {formatMoney(netOperatingIncome)}
              </p>
            </Panel>
          </div>

          <div className="mb-6 grid gap-6 lg:grid-cols-2">
            <Panel>
              <h2 className="mb-3 text-sm font-semibold text-[var(--color-ink)]">Revenue by rate type</h2>
              {rateTypes.map((type) => {
                const row = analytics.byRateType[type]
                if (row.count === 0) return null
                return (
                  <div key={type} className="mb-2 flex justify-between text-sm py-1 border-b border-[var(--color-line)] last:border-none">
                    <span>{rateTypeReportLabel(type)}</span>
                    <span className="font-medium">
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
              <h2 className="mb-3 text-sm font-semibold text-[var(--color-ink)]">Top performing rooms</h2>
              {analytics.topRooms.length === 0 ? (
                <p className="text-sm text-[var(--color-muted)]">No data yet.</p>
              ) : (
                <ul className="space-y-2">
                  {analytics.topRooms.map((r) => (
                    <li key={r.roomId} className="flex justify-between text-sm py-1 border-b border-[var(--color-line)] last:border-none">
                      <span className="font-medium">Room {r.roomNumber}</span>
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
            <h2 className="mb-3 text-sm font-semibold text-[var(--color-ink)]">Night audit history</h2>
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
              <h2 className="mb-3 text-sm font-semibold text-[var(--color-ink)]">Activity log</h2>
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
        </>
      )}

      {/* TAB 2: SHIFT HANDOVER & CASH DRAWER */}
      {tab === 'shifts' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[var(--color-line)] bg-white p-5">
            <div>
              <h3 className="font-semibold text-base text-[var(--color-ink)]">Current Shift Status</h3>
              <p className="text-xs text-[var(--color-muted)] mt-0.5">
                Reconcile physical cash drawer with Mobile Money receipts before handing over to the next receptionist.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShiftModalOpen(true)}
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-xs font-semibold text-white shadow-sm"
            >
              {activeShift ? 'View Active Drawer / Close Shift' : 'Start New Front Desk Shift'}
            </button>
          </div>

          <Panel>
            <h3 className="text-sm font-semibold text-[var(--color-ink)] mb-4">Past Shifts & Cash Reconciliations</h3>
            {shifts.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">No shift logs found yet. Start your first shift above!</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[var(--color-line)] text-[var(--color-muted)] uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 font-medium">Date & Time</th>
                      <th className="py-2.5 font-medium">Staff</th>
                      <th className="py-2.5 font-medium">Float</th>
                      <th className="py-2.5 font-medium">Counted Cash</th>
                      <th className="py-2.5 font-medium">Variance</th>
                      <th className="py-2.5 font-medium">MoMo Total</th>
                      <th className="py-2.5 font-medium">Status</th>
                      <th className="py-2.5 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-line)]">
                    {shifts.map((s) => (
                      <tr key={s.id} className="hover:bg-[var(--color-cream)]/50">
                        <td className="py-3 font-medium text-[var(--color-ink)]">
                          {s.date} <span className="text-[var(--color-muted)] font-normal">({s.startTime} - {s.endTime})</span>
                        </td>
                        <td className="py-3">{s.staffName}</td>
                        <td className="py-3">{formatMoney(s.openingFloat ?? 0)}</td>
                        <td className="py-3 font-medium">
                          {s.closingCash !== undefined ? formatMoney(s.closingCash) : '—'}
                        </td>
                        <td className="py-3">
                          {s.cashDifference !== undefined ? (
                            <span
                              className={`rounded px-1.5 py-0.5 font-semibold text-[10px] ${
                                s.cashDifference === 0
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : s.cashDifference > 0
                                    ? 'bg-sky-100 text-sky-800'
                                    : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {s.cashDifference === 0
                                ? 'Balanced'
                                : s.cashDifference > 0
                                  ? `+${formatMoney(s.cashDifference)}`
                                  : `-${formatMoney(Math.abs(s.cashDifference))}`}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3 text-amber-700 font-medium">
                          {s.totalMomoCollected !== undefined ? formatMoney(s.totalMomoCollected) : '—'}
                        </td>
                        <td className="py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                              s.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {s.status || 'closed'}
                          </span>
                        </td>
                        <td className="py-3 text-[var(--color-muted)] max-w-xs truncate">
                          {s.handoverNotes || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* TAB 3: PETTY CASH & EXPENSES */}
      {tab === 'expenses' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Panel className="!p-4">
              <span className="text-xs text-[var(--color-muted)]">Total Period Expenses</span>
              <p className="text-xl font-bold text-rose-700 mt-1">{formatMoney(totalExpenseAmount)}</p>
              <p className="text-[11px] text-[var(--color-muted)] mt-1">{periodExpenses.length} expense entries recorded</p>
            </Panel>
            <Panel className="!p-4">
              <span className="text-xs text-[var(--color-muted)]">Top Expense Driver</span>
              <p className="text-base font-semibold text-[var(--color-ink)] mt-1">
                {expensesByCategory[0] ? CATEGORY_LABELS[expensesByCategory[0][0]] : 'None'}
              </p>
              <p className="text-[11px] text-[var(--color-muted)] mt-1">
                {expensesByCategory[0] ? formatMoney(expensesByCategory[0][1]) : '₵0.00'}
              </p>
            </Panel>
            <Panel className="!p-4 flex flex-col justify-between">
              <div>
                <span className="text-xs text-[var(--color-muted)]">Net Branch Profit</span>
                <p className={`text-xl font-bold mt-1 ${netOperatingIncome >= 0 ? 'text-emerald-800' : 'text-rose-700'}`}>
                  {formatMoney(netOperatingIncome)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExpenseModalOpen(true)}
                className="mt-3 rounded-lg bg-[var(--color-accent)] py-2 text-xs font-semibold text-white text-center"
              >
                + Record New Expense
              </button>
            </Panel>
          </div>

          {/* Category pills */}
          {expensesByCategory.length > 0 && (
            <Panel>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)] mb-3">
                Expense Breakdown By Category
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {expensesByCategory.map(([cat, amt]) => (
                  <div key={cat} className="rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] p-2.5">
                    <p className="text-xs text-[var(--color-muted)] truncate">{CATEGORY_LABELS[cat]}</p>
                    <p className="text-sm font-semibold text-[var(--color-ink)] mt-0.5">{formatMoney(amt)}</p>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {/* Expenses Table */}
          <Panel>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[var(--color-ink)]">Expense Ledger</h3>
              <button
                type="button"
                onClick={() => setExpenseModalOpen(true)}
                className="text-xs font-semibold text-[var(--color-accent)] hover:underline"
              >
                + Add Expense
              </button>
            </div>

            {expenses.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">No expenses recorded yet. Click above to record fuel, ECG, or supplies.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[var(--color-line)] text-[var(--color-muted)] uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 font-medium">Date</th>
                      <th className="py-2.5 font-medium">Category</th>
                      <th className="py-2.5 font-medium">Description</th>
                      <th className="py-2.5 font-medium">Amount</th>
                      <th className="py-2.5 font-medium">Payment</th>
                      <th className="py-2.5 font-medium">Receipt Ref</th>
                      <th className="py-2.5 font-medium">Recorded By</th>
                      <th className="py-2.5 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-line)]">
                    {expenses.map((e) => (
                      <tr key={e.id} className="hover:bg-[var(--color-cream)]/50">
                        <td className="py-3 font-medium text-[var(--color-ink)]">{e.date}</td>
                        <td className="py-3">
                          <span className="rounded bg-gray-100 px-2 py-0.5 font-medium text-[11px] text-gray-800">
                            {CATEGORY_LABELS[e.category] || e.category}
                          </span>
                        </td>
                        <td className="py-3 font-medium">{e.title}</td>
                        <td className="py-3 font-bold text-rose-700">{formatMoney(e.amount)}</td>
                        <td className="py-3 uppercase text-[10px] font-semibold text-[var(--color-muted)]">
                          {e.paymentMethod}
                        </td>
                        <td className="py-3 font-mono text-[11px] text-[var(--color-muted)]">{e.receiptRef || '—'}</td>
                        <td className="py-3 text-[var(--color-muted)]">{e.recordedByName}</td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Delete expense "${e.title}"?`)) {
                                removeExpense(e.id)
                              }
                            }}
                            className="text-gray-400 hover:text-rose-600 transition"
                            title="Delete entry"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* Modals */}
      <ShiftHandoverModal open={shiftModalOpen} onClose={() => setShiftModalOpen(false)} />
      <LogExpenseModal open={expenseModalOpen} onClose={() => setExpenseModalOpen(false)} />
    </div>
  )
}
