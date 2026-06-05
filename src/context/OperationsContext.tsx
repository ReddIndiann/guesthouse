import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from './AuthContext'
import { useGuestplace } from './GuestplaceContext'
import {
  addBookingChargeRecord,
  applyBookingExtension,
  assignHousekeepingTask,
  changeBookingRoom,
  completeHousekeepingTask,
  createHousekeepingTask,
  createMaintenanceTicket,
  createShift,
  deleteShift,
  extendBookingStay,
  getActiveShift,
  logActivity,
  runNightAudit,
  shouldRunNightAudit,
  subscribeToActivityLog,
  subscribeToHousekeepingTasks,
  subscribeToMaintenanceTickets,
  subscribeToNightAudits,
  subscribeToShifts,
  syncPublicFolio,
  toggleChecklistItem,
  updateMaintenanceTicket,
} from '../lib/operations'
import type {
  ActivityLogEntry,
  AddBookingChargeInput,
  ChangeBookingRoomInput,
  ExtendBookingInput,
  HousekeepingTask,
  MaintenancePriority,
  MaintenanceTicket,
  NightAuditSnapshot,
  StaffShift,
} from '../types'

interface OperationsContextValue {
  housekeepingTasks: HousekeepingTask[]
  maintenanceTickets: MaintenanceTicket[]
  activityLog: ActivityLogEntry[]
  shifts: StaffShift[]
  nightAudits: NightAuditSnapshot[]
  activeShift: StaffShift | null
  extendStay: (bookingId: string, input: ExtendBookingInput) => Promise<void>
  changeRoom: (bookingId: string, input: ChangeBookingRoomInput) => Promise<void>
  addCharge: (bookingId: string, input: AddBookingChargeInput) => Promise<void>
  assignTask: (taskId: string, staffId: string, staffName: string) => Promise<void>
  toggleTaskItem: (taskId: string, itemId: string, done: boolean) => Promise<void>
  completeTask: (taskId: string, roomId: string) => Promise<void>
  reportMaintenance: (input: {
    roomId: string
    title: string
    description: string
    priority: MaintenancePriority
  }) => Promise<void>
  updateTicket: (
    ticketId: string,
    roomId: string,
    updates: Partial<Pick<MaintenanceTicket, 'status' | 'priority' | 'assignedTo' | 'assignedToName'>>,
  ) => Promise<void>
  addShift: (input: Omit<StaffShift, 'id' | 'createdAt'>) => Promise<void>
  removeShift: (shiftId: string) => Promise<void>
  getFolioUrl: (bookingId: string) => Promise<string>
}

const OperationsContext = createContext<OperationsContextValue | null>(null)

export function OperationsProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth()
  const { rooms, bookings, settings, getRoom, getGuest } = useGuestplace()

  const [housekeepingTasks, setHousekeepingTasks] = useState<HousekeepingTask[]>([])
  const [maintenanceTickets, setMaintenanceTickets] = useState<MaintenanceTicket[]>([])
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([])
  const [shifts, setShifts] = useState<StaffShift[]>([])
  const [nightAudits, setNightAudits] = useState<NightAuditSnapshot[]>([])
  const [activeShift, setActiveShift] = useState<StaffShift | null>(null)

  const propertyId = profile?.propertyId
  const actor = useMemo(
    () => ({
      uid: user?.uid ?? '',
      name: profile?.displayName ?? 'Staff',
    }),
    [user, profile],
  )

  useEffect(() => {
    if (!propertyId) {
      setHousekeepingTasks([])
      setMaintenanceTickets([])
      setActivityLog([])
      setShifts([])
      setNightAudits([])
      return
    }

    const onError = (err: Error) => console.error(err)
    const unsubs = [
      subscribeToHousekeepingTasks(propertyId, setHousekeepingTasks, onError),
      subscribeToMaintenanceTickets(propertyId, setMaintenanceTickets, onError),
      subscribeToActivityLog(propertyId, setActivityLog, onError),
      subscribeToShifts(propertyId, setShifts, onError),
      subscribeToNightAudits(propertyId, setNightAudits, onError),
    ]
    return () => unsubs.forEach((u) => u())
  }, [propertyId])

  useEffect(() => {
    if (!propertyId || !user?.uid) {
      setActiveShift(null)
      return
    }
    getActiveShift(propertyId, user.uid).then(setActiveShift).catch(console.error)
  }, [propertyId, user?.uid, shifts])

  useEffect(() => {
    if (!propertyId || !settings) return
    const auditDate = shouldRunNightAudit(settings)
    if (!auditDate) return

    runNightAudit(propertyId, auditDate, rooms, bookings)
      .then((snapshot) =>
        logActivity(propertyId, {
          action: 'night_audit',
          entityType: 'system',
          details: `Audited ${auditDate}: ${snapshot.checkedOutCount} auto check-outs, ${snapshot.overstayCount} overstays`,
          performedBy: 'system',
          performedByName: 'Night audit',
        }),
      )
      .catch(console.error)
  }, [propertyId, settings.lastNightAuditDate, rooms.length, bookings.length])

  const audit = useCallback(
    async (action: string, entityType: ActivityLogEntry['entityType'], entityId?: string, details?: string) => {
      if (!propertyId) return
      await logActivity(propertyId, {
        action,
        entityType,
        entityId,
        details,
        performedBy: actor.uid,
        performedByName: actor.name,
        shiftId: activeShift?.id,
      })
    },
    [propertyId, actor, activeShift],
  )

  const extendStay = useCallback(
    async (bookingId: string, input: ExtendBookingInput) => {
      if (!propertyId) return
      const booking = bookings.find((b) => b.id === bookingId)
      const room = booking ? getRoom(booking.roomId) : undefined
      if (!booking || !room) throw new Error('Booking not found')

      const updates = await extendBookingStay(
        propertyId,
        booking,
        input,
        room,
        bookings,
        settings,
      )
      await applyBookingExtension(propertyId, bookingId, {
        ...updates,
        extraCharges: booking.extraCharges,
      })
      await audit('extend_stay', 'booking', bookingId, `Extended via ${input.option}`)
    },
    [propertyId, bookings, getRoom, settings, audit],
  )

  const changeRoom = useCallback(
    async (bookingId: string, input: ChangeBookingRoomInput) => {
      if (!propertyId) return
      const booking = bookings.find((b) => b.id === bookingId)
      const oldRoom = booking ? getRoom(booking.roomId) : undefined
      const newRoom = getRoom(input.newRoomId)
      if (!booking || !oldRoom || !newRoom) throw new Error('Booking or room not found')

      await changeBookingRoom(
        propertyId,
        booking,
        input,
        oldRoom,
        newRoom,
        bookings,
        settings,
      )
      await audit(
        'change_room',
        'booking',
        bookingId,
        `Moved from ${oldRoom.number} to ${newRoom.number}`,
      )
    },
    [propertyId, bookings, getRoom, settings, audit],
  )

  const addCharge = useCallback(
    async (bookingId: string, input: AddBookingChargeInput) => {
      if (!propertyId) return
      const booking = bookings.find((b) => b.id === bookingId)
      if (!booking) throw new Error('Booking not found')
      const charge = await addBookingChargeRecord(propertyId, booking, input, actor)
      await audit('add_charge', 'booking', bookingId, `${charge.description}: ₵${charge.amount}`)
    },
    [propertyId, bookings, actor, audit],
  )

  const assignTask = useCallback(
    async (taskId: string, staffId: string, staffName: string) => {
      if (!propertyId) return
      await assignHousekeepingTask(propertyId, taskId, staffId, staffName)
      await audit('assign_task', 'housekeeping', taskId, `Assigned to ${staffName}`)
    },
    [propertyId, audit],
  )

  const toggleTaskItem = useCallback(
    async (taskId: string, itemId: string, done: boolean) => {
      if (!propertyId) return
      const task = housekeepingTasks.find((t) => t.id === taskId)
      if (!task) return
      await toggleChecklistItem(propertyId, taskId, itemId, done, task.checklist)
    },
    [propertyId, housekeepingTasks],
  )

  const completeTask = useCallback(
    async (taskId: string, roomId: string) => {
      if (!propertyId) return
      await completeHousekeepingTask(propertyId, taskId, roomId)
      await audit('complete_task', 'housekeeping', taskId, `Room marked ready`)
    },
    [propertyId, audit],
  )

  const reportMaintenance = useCallback(
    async (input: {
      roomId: string
      title: string
      description: string
      priority: MaintenancePriority
    }) => {
      if (!propertyId) return
      const id = await createMaintenanceTicket(propertyId, {
        ...input,
        reportedBy: actor.uid,
        reportedByName: actor.name,
      })
      await audit('maintenance_report', 'maintenance', id, input.title)
    },
    [propertyId, actor, audit],
  )

  const updateTicket = useCallback(
    async (
      ticketId: string,
      roomId: string,
      updates: Partial<Pick<MaintenanceTicket, 'status' | 'priority' | 'assignedTo' | 'assignedToName'>>,
    ) => {
      if (!propertyId) return
      await updateMaintenanceTicket(propertyId, ticketId, updates, roomId)
      await audit('update_ticket', 'maintenance', ticketId, updates.status ?? 'updated')
    },
    [propertyId, audit],
  )

  const addShift = useCallback(
    async (input: Omit<StaffShift, 'id' | 'createdAt'>) => {
      if (!propertyId) return
      const id = await createShift(propertyId, input)
      await audit('create_shift', 'shift', id, `${input.staffName} on ${input.date}`)
    },
    [propertyId, audit],
  )

  const removeShift = useCallback(
    async (shiftId: string) => {
      if (!propertyId) return
      await deleteShift(propertyId, shiftId)
      await audit('delete_shift', 'shift', shiftId)
    },
    [propertyId, audit],
  )

  const getFolioUrl = useCallback(
    async (bookingId: string) => {
      if (!propertyId) throw new Error('Not signed in')
      const booking = bookings.find((b) => b.id === bookingId)
      const guest = booking ? getGuest(booking.guestId) : undefined
      const room = booking ? getRoom(booking.roomId) : undefined
      if (!booking || !guest || !room) throw new Error('Booking not found')
      const token = await syncPublicFolio(propertyId, booking, guest, room, settings)
      return `${window.location.origin}/folio/${token}`
    },
    [propertyId, bookings, getGuest, getRoom, settings],
  )

  const value = useMemo(
    () => ({
      housekeepingTasks,
      maintenanceTickets,
      activityLog,
      shifts,
      nightAudits,
      activeShift,
      extendStay,
      changeRoom,
      addCharge,
      assignTask,
      toggleTaskItem,
      completeTask,
      reportMaintenance,
      updateTicket,
      addShift,
      removeShift,
      getFolioUrl,
    }),
    [
      housekeepingTasks,
      maintenanceTickets,
      activityLog,
      shifts,
      nightAudits,
      activeShift,
      extendStay,
      changeRoom,
      addCharge,
      assignTask,
      toggleTaskItem,
      completeTask,
      reportMaintenance,
      updateTicket,
      addShift,
      removeShift,
      getFolioUrl,
    ],
  )

  return <OperationsContext.Provider value={value}>{children}</OperationsContext.Provider>
}

export function useOperations() {
  const ctx = useContext(OperationsContext)
  if (!ctx) throw new Error('useOperations must be used within OperationsProvider')
  return ctx
}

export { createHousekeepingTask }
