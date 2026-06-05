import { useMemo, useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { useRbac } from '../context/RbacContext'
import { useGuestplace } from '../context/GuestplaceContext'
import { useOperations } from '../context/OperationsContext'
import { subscribeToStaff } from '../lib/firestore'
import { useAuth } from '../context/AuthContext'
import { useEffect } from 'react'
import type { StaffProfile } from '../types/auth'
import type { MaintenancePriority } from '../types'
import { turnoverMinutes } from '../lib/operations'
export function HousekeepingPage() {
  const { can } = useRbac()
  const { profile } = useAuth()
  const { rooms, getRoom } = useGuestplace()
  const {
    housekeepingTasks,
    maintenanceTickets,
    shifts,
    assignTask,
    toggleTaskItem,
    completeTask,
    reportMaintenance,
    updateTicket,
    addShift,
    removeShift,
    activeShift,
  } = useOperations()

  const [staff, setStaff] = useState<StaffProfile[]>([])
  const [maintRoom, setMaintRoom] = useState('')
  const [maintTitle, setMaintTitle] = useState('')
  const [maintDesc, setMaintDesc] = useState('')
  const [maintPriority, setMaintPriority] = useState<MaintenancePriority>('medium')
  const [shiftStaff, setShiftStaff] = useState('')
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().split('T')[0])
  const [shiftStart, setShiftStart] = useState('08:00')
  const [shiftEnd, setShiftEnd] = useState('16:00')

  useEffect(() => {
    if (!profile?.propertyId) return
    return subscribeToStaff(profile.propertyId, setStaff, console.error)
  }, [profile?.propertyId])

  const activeTasks = useMemo(
    () => housekeepingTasks.filter((t) => t.status !== 'completed'),
    [housekeepingTasks],
  )

  const openTickets = useMemo(
    () => maintenanceTickets.filter((t) => t.status !== 'resolved'),
    [maintenanceTickets],
  )

  const todayShifts = useMemo(
    () => shifts.filter((s) => s.date === new Date().toISOString().split('T')[0]),
    [shifts],
  )

  const avgTurnover = useMemo(() => {
    const completed = housekeepingTasks.filter((t) => t.completedAt && t.startedAt)
    if (completed.length === 0) return null
    const total = completed.reduce((sum, t) => sum + (turnoverMinutes(t.startedAt, t.completedAt) ?? 0), 0)
    return Math.round(total / completed.length)
  }, [housekeepingTasks])

  const canManage = can('housekeeping.manage')

  return (
    <div>
      <PageHeader
        title="Housekeeping"
        subtitle={
          activeShift
            ? `On shift: ${activeShift.startTime}–${activeShift.endTime}`
            : 'Tasks, maintenance, and shifts'
        }
      />

      {avgTurnover !== null && (
        <Panel className="mb-6">
          <p className="text-sm text-[var(--color-muted)]">
            Avg turnover time: <strong className="text-[var(--color-ink)]">{avgTurnover} min</strong>
          </p>
        </Panel>
      )}

      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Panel>
          <h2 className="mb-4 text-sm font-medium text-[var(--color-ink)]">Cleaning tasks</h2>
          {activeTasks.length === 0 ? (
            <p className="text-sm text-[var(--color-muted)]">All rooms are ready.</p>
          ) : (
            <ul className="space-y-4">
              {activeTasks.map((task) => {
                const room = getRoom(task.roomId)
                const turnover = turnoverMinutes(
                  room?.cleaningStartedAt ?? task.createdAt,
                  task.completedAt,
                )
                return (
                  <li key={task.id} className="rounded-xl border border-[var(--color-line)] p-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">Room {room?.number ?? '—'}</span>
                      <span className="text-xs text-[var(--color-muted)]">
                        {task.assignedToName ?? 'Unassigned'}
                        {turnover !== null && ` · ${turnover} min`}
                      </span>
                    </div>
                    <ul className="mb-3 space-y-1">
                      {task.checklist.map((item) => (
                        <li key={item.id}>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={item.done}
                              disabled={!canManage}
                              onChange={(e) =>
                                toggleTaskItem(task.id, item.id, e.target.checked)
                              }
                            />
                            <span className={item.done ? 'line-through text-[var(--color-muted)]' : ''}>
                              {item.label}
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                    {canManage && (
                      <div className="flex flex-wrap gap-2">
                        {!task.assignedTo && (
                          <select
                            className="rounded-lg border border-[var(--color-line)] px-2 py-1 text-xs"
                            defaultValue=""
                            onChange={(e) => {
                              const s = staff.find((st) => st.uid === e.target.value)
                              if (s) assignTask(task.id, s.uid, s.displayName)
                            }}
                          >
                            <option value="">Assign to…</option>
                            {staff.map((s) => (
                              <option key={s.uid} value={s.uid}>
                                {s.displayName}
                              </option>
                            ))}
                          </select>
                        )}
                        <button
                          type="button"
                          onClick={() => completeTask(task.id, task.roomId)}
                          className="rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white"
                        >
                          Mark ready
                        </button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <Panel>
          <h2 className="mb-4 text-sm font-medium text-[var(--color-ink)]">Maintenance tickets</h2>
          {openTickets.length === 0 ? (
            <p className="mb-4 text-sm text-[var(--color-muted)]">No open tickets.</p>
          ) : (
            <ul className="mb-4 space-y-3">
              {openTickets.map((ticket) => {
                const room = getRoom(ticket.roomId)
                return (
                  <li key={ticket.id} className="rounded-lg bg-[var(--color-cream)] p-3 text-sm">
                    <p className="font-medium">
                      Room {room?.number} · {ticket.title}
                    </p>
                    <p className="text-[var(--color-muted)]">{ticket.description}</p>
                    <p className="mt-1 text-xs capitalize">
                      {ticket.priority} · {ticket.status.replace('_', ' ')}
                    </p>
                    {canManage && ticket.status !== 'resolved' && (
                      <button
                        type="button"
                        onClick={() =>
                          updateTicket(ticket.id, ticket.roomId, { status: 'resolved' })
                        }
                        className="mt-2 text-xs text-[var(--color-accent)]"
                      >
                        Mark resolved
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          {canManage && (
            <form
              className="space-y-2 border-t border-[var(--color-line)] pt-4"
              onSubmit={async (e) => {
                e.preventDefault()
                if (!maintRoom || !maintTitle) return
                await reportMaintenance({
                  roomId: maintRoom,
                  title: maintTitle,
                  description: maintDesc,
                  priority: maintPriority,
                })
                setMaintTitle('')
                setMaintDesc('')
              }}
            >
              <p className="text-xs font-medium text-[var(--color-muted)]">Report issue</p>
              <select
                value={maintRoom}
                onChange={(e) => setMaintRoom(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm"
                required
              >
                <option value="">Room…</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    Room {r.number}
                  </option>
                ))}
              </select>
              <input
                placeholder="Title (e.g. AC broken)"
                value={maintTitle}
                onChange={(e) => setMaintTitle(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm"
                required
              />
              <textarea
                placeholder="Details"
                value={maintDesc}
                onChange={(e) => setMaintDesc(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm"
                rows={2}
              />
              <select
                value={maintPriority}
                onChange={(e) => setMaintPriority(e.target.value as MaintenancePriority)}
                className="w-full rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
              <button
                type="submit"
                className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white"
              >
                Create ticket
              </button>
            </form>
          )}
        </Panel>
      </div>

      {can('shifts.manage') && (
        <Panel>
          <h2 className="mb-4 text-sm font-medium text-[var(--color-ink)]">Today's shifts</h2>
          {todayShifts.length === 0 ? (
            <p className="mb-4 text-sm text-[var(--color-muted)]">No shifts scheduled today.</p>
          ) : (
            <ul className="mb-4 divide-y divide-[var(--color-line)]">
              {todayShifts.map((shift) => (
                <li key={shift.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    {shift.staffName} · {shift.startTime}–{shift.endTime}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeShift(shift.id)}
                    className="text-xs text-rose-600"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={async (e) => {
              e.preventDefault()
              const s = staff.find((st) => st.uid === shiftStaff)
              if (!s) return
              await addShift({
                staffId: s.uid,
                staffName: s.displayName,
                date: shiftDate,
                startTime: shiftStart,
                endTime: shiftEnd,
              })
            }}
          >
            <select
              value={shiftStaff}
              onChange={(e) => setShiftStaff(e.target.value)}
              className="rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm"
              required
            >
              <option value="">Staff…</option>
              {staff.map((s) => (
                <option key={s.uid} value={s.uid}>
                  {s.displayName}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={shiftDate}
              onChange={(e) => setShiftDate(e.target.value)}
              className="rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm"
            />
            <input
              type="time"
              value={shiftStart}
              onChange={(e) => setShiftStart(e.target.value)}
              className="rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm"
            />
            <input
              type="time"
              value={shiftEnd}
              onChange={(e) => setShiftEnd(e.target.value)}
              className="rounded-lg border border-[var(--color-line)] px-3 py-2 text-sm"
            />
            <button
              type="submit"
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white"
            >
              Add shift
            </button>
          </form>
        </Panel>
      )}
    </div>
  )
}
