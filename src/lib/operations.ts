import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import type {
  ActivityEntityType,
  ActivityLogEntry,
  AddBookingChargeInput,
  Booking,
  BookingCharge,
  ChangeBookingRoomInput,
  ExtendBookingInput,
  Guest,
  HousekeepingChecklistItem,
  HousekeepingTask,
  MaintenanceTicket,
  MaintenancePriority,
  NightAuditSnapshot,
  PropertySettings,
  PublicFolio,
  Room,
  StaffShift,
} from '../types'
import { DEFAULT_HOUSEKEEPING_CHECKLIST as CHECKLIST_LABELS } from '../types'
import {
  bookingBaseAmount,
  bookingTotalWithCharges,
  hasRoomConflict,
  normalizePayment,
} from '../utils/bookings'
import { addDaysISO, todayISO } from '../utils/dates'
import { addMinutesToTime, bookingRangeMs } from '../utils/datetime'
import { calculateBookingTotal } from '../utils/pricing'
import { db } from './firebase'

type OpsCollection =
  | 'housekeepingTasks'
  | 'maintenanceTickets'
  | 'activityLog'
  | 'shifts'
  | 'nightAudits'

function opsCollection(propertyId: string, name: OpsCollection) {
  return collection(db, 'properties', propertyId, name)
}

function mapDoc<T extends { id: string }>(snap: QueryDocumentSnapshot<DocumentData>): T {
  return { id: snap.id, ...snap.data() } as T
}

function generateToken(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16)
}

function makeChecklist(): HousekeepingChecklistItem[] {
  return CHECKLIST_LABELS.map((label, i) => ({
    id: `item-${i}`,
    label,
    done: false,
  }))
}

export function turnoverMinutes(startedAt?: string, completedAt?: string): number | null {
  if (!startedAt) return null
  const end = completedAt ? new Date(completedAt).getTime() : Date.now()
  return Math.round((end - new Date(startedAt).getTime()) / 60000)
}

// ── Subscriptions ──────────────────────────────────────────────

export function subscribeToHousekeepingTasks(
  propertyId: string,
  onData: (tasks: HousekeepingTask[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    opsCollection(propertyId, 'housekeepingTasks'),
    (snapshot) => {
      const tasks = snapshot.docs.map((d) => mapDoc<HousekeepingTask>(d))
      tasks.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      onData(tasks)
    },
    (err) => onError(err),
  )
}

export function subscribeToMaintenanceTickets(
  propertyId: string,
  onData: (tickets: MaintenanceTicket[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    opsCollection(propertyId, 'maintenanceTickets'),
    (snapshot) => {
      const tickets = snapshot.docs.map((d) => mapDoc<MaintenanceTicket>(d))
      tickets.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      onData(tickets)
    },
    (err) => onError(err),
  )
}

export function subscribeToActivityLog(
  propertyId: string,
  onData: (entries: ActivityLogEntry[]) => void,
  onError: (error: Error) => void,
  limit = 200,
): Unsubscribe {
  return onSnapshot(
    opsCollection(propertyId, 'activityLog'),
    (snapshot) => {
      const entries = snapshot.docs.map((d) => mapDoc<ActivityLogEntry>(d))
      entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      onData(entries.slice(0, limit))
    },
    (err) => onError(err),
  )
}

export function subscribeToShifts(
  propertyId: string,
  onData: (shifts: StaffShift[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    opsCollection(propertyId, 'shifts'),
    (snapshot) => {
      const shifts = snapshot.docs.map((d) => mapDoc<StaffShift>(d))
      shifts.sort((a, b) => b.date.localeCompare(a.date) || a.startTime.localeCompare(b.startTime))
      onData(shifts)
    },
    (err) => onError(err),
  )
}

export function subscribeToNightAudits(
  propertyId: string,
  onData: (audits: NightAuditSnapshot[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    opsCollection(propertyId, 'nightAudits'),
    (snapshot) => {
      const audits = snapshot.docs.map((d) => mapDoc<NightAuditSnapshot>(d))
      audits.sort((a, b) => b.date.localeCompare(a.date))
      onData(audits)
    },
    (err) => onError(err),
  )
}

// ── Activity log ─────────────────────────────────────────────────

export async function logActivity(
  propertyId: string,
  input: {
    action: string
    entityType: ActivityEntityType
    entityId?: string
    details?: string
    performedBy: string
    performedByName: string
    shiftId?: string
  },
): Promise<void> {
  const ref = doc(opsCollection(propertyId, 'activityLog'))
  await setDoc(ref, { ...input, createdAt: new Date().toISOString() })
}

// ── Housekeeping ─────────────────────────────────────────────────

export async function createHousekeepingTask(
  propertyId: string,
  roomId: string,
): Promise<string> {
  const ref = doc(opsCollection(propertyId, 'housekeepingTasks'))
  const now = new Date().toISOString()
  await setDoc(ref, {
    roomId,
    checklist: makeChecklist(),
    status: 'pending',
    createdAt: now,
  })
  return ref.id
}

export async function assignHousekeepingTask(
  propertyId: string,
  taskId: string,
  staffId: string,
  staffName: string,
): Promise<void> {
  await updateDoc(doc(opsCollection(propertyId, 'housekeepingTasks'), taskId), {
    assignedTo: staffId,
    assignedToName: staffName,
    status: 'in_progress',
    startedAt: new Date().toISOString(),
  })
}

export async function toggleChecklistItem(
  propertyId: string,
  taskId: string,
  itemId: string,
  done: boolean,
  checklist: HousekeepingChecklistItem[],
): Promise<void> {
  const updated = checklist.map((item) => (item.id === itemId ? { ...item, done } : item))
  await updateDoc(doc(opsCollection(propertyId, 'housekeepingTasks'), taskId), {
    checklist: updated,
  })
}

export async function completeHousekeepingTask(
  propertyId: string,
  taskId: string,
  roomId: string,
): Promise<void> {
  const batch = writeBatch(db)
  const now = new Date().toISOString()
  batch.update(doc(opsCollection(propertyId, 'housekeepingTasks'), taskId), {
    status: 'completed',
    completedAt: now,
  })
  batch.update(doc(db, 'properties', propertyId, 'rooms', roomId), {
    status: 'available',
    cleaningStartedAt: deleteField(),
  })
  await batch.commit()
}

export async function createMaintenanceTicket(
  propertyId: string,
  input: {
    roomId: string
    title: string
    description: string
    priority: MaintenancePriority
    reportedBy: string
    reportedByName: string
  },
): Promise<string> {
  const ref = doc(opsCollection(propertyId, 'maintenanceTickets'))
  await setDoc(ref, {
    ...input,
    status: 'open',
    createdAt: new Date().toISOString(),
  })
  await updateDoc(doc(db, 'properties', propertyId, 'rooms', input.roomId), {
    status: 'maintenance',
  })
  return ref.id
}

export async function updateMaintenanceTicket(
  propertyId: string,
  ticketId: string,
  updates: Partial<Pick<MaintenanceTicket, 'status' | 'priority' | 'assignedTo' | 'assignedToName'>>,
  roomId: string,
): Promise<void> {
  const data: Record<string, unknown> = { ...updates }
  if (updates.status === 'resolved') {
    data.resolvedAt = new Date().toISOString()
  }
  await updateDoc(doc(opsCollection(propertyId, 'maintenanceTickets'), ticketId), data)
  if (updates.status === 'resolved') {
    await updateDoc(doc(db, 'properties', propertyId, 'rooms', roomId), { status: 'available' })
  }
}

// ── Shifts ───────────────────────────────────────────────────────

export async function createShift(
  propertyId: string,
  input: Omit<StaffShift, 'id' | 'createdAt'>,
): Promise<string> {
  const ref = doc(opsCollection(propertyId, 'shifts'))
  await setDoc(ref, { ...input, createdAt: new Date().toISOString() })
  return ref.id
}

export async function deleteShift(propertyId: string, shiftId: string): Promise<void> {
  await deleteDoc(doc(opsCollection(propertyId, 'shifts'), shiftId))
}

export async function getActiveShift(
  propertyId: string,
  staffId: string,
): Promise<StaffShift | null> {
  const today = todayISO()
  const q = query(
    opsCollection(propertyId, 'shifts'),
    where('staffId', '==', staffId),
    where('date', '==', today),
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  for (const d of snap.docs) {
    const shift = mapDoc<StaffShift>(d)
    const [sh, sm] = shift.startTime.split(':').map(Number)
    const [eh, em] = shift.endTime.split(':').map(Number)
    const start = sh * 60 + sm
    const end = eh * 60 + em
    if (currentMinutes >= start && currentMinutes <= end) return shift
  }
  return mapDoc<StaffShift>(snap.docs[0])
}

// ── Booking amendments ───────────────────────────────────────────

export async function extendBookingStay(
  _propertyId: string,
  booking: Booking,
  input: ExtendBookingInput,
  room: Room,
  existingBookings: Booking[],
  settings: PropertySettings,
): Promise<{ checkOut: string; checkOutTime?: string; hours?: number; baseAmount: number }> {
  let checkOut = booking.checkOut
  let checkOutTime = booking.checkOutTime
  let hours = booking.hours
  let baseAmount = bookingBaseAmount(booking)
  const rateType = booking.rateType

  if (input.option === 'two_hours') {
    if (!checkOutTime) throw new Error('Cannot extend — no checkout time set')
    const end = addMinutesToTime(checkOutTime, 120)
    checkOut = end.dayOffset > 0 ? addDaysISO(checkOut, end.dayOffset) : checkOut
    checkOutTime = end.time
    if (rateType === 'two_hours') {
      baseAmount += calculateBookingTotal(settings.rates, room, 'two_hours')
    } else if (rateType === 'per_hour') {
      hours = (hours ?? 1) + 2
      baseAmount = calculateBookingTotal(settings.rates, room, 'per_hour', {
        hours,
      })
    } else {
      const extra = calculateBookingTotal(settings.rates, room, 'two_hours')
      baseAmount += extra
    }
  } else if (input.option === 'one_night') {
    checkOut = addDaysISO(checkOut, 1)
    if (rateType === 'full_day') {
      baseAmount = calculateBookingTotal(settings.rates, room, 'full_day', {
        checkIn: booking.checkIn,
        checkOut,
      })
    } else {
      const extra = calculateBookingTotal(settings.rates, room, 'full_day', {
        checkIn: booking.checkOut,
        checkOut,
      })
      baseAmount += extra
    }
  } else if (input.option === 'custom_hours') {
    const addH = Math.max(1, input.customHours ?? 1)
    if (!checkOutTime) throw new Error('Cannot extend — no checkout time set')
    const end = addMinutesToTime(checkOutTime, addH * 60)
    checkOut = end.dayOffset > 0 ? addDaysISO(checkOut, end.dayOffset) : checkOut
    checkOutTime = end.time
    if (rateType === 'per_hour') {
      hours = (hours ?? 1) + addH
      baseAmount = calculateBookingTotal(settings.rates, room, 'per_hour', {
        hours,
      })
    } else {
      baseAmount += calculateBookingTotal(settings.rates, room, 'per_hour', {
        hours: addH,
      })
    }
  }

  if (
    hasRoomConflict(
      existingBookings,
      booking.roomId,
      booking.checkIn,
      checkOut,
      booking.checkInTime,
      checkOutTime,
      booking.id,
    )
  ) {
    throw new Error('Extension conflicts with another booking')
  }

  return { checkOut, checkOutTime, hours, baseAmount }
}

export async function changeBookingRoom(
  propertyId: string,
  booking: Booking,
  input: ChangeBookingRoomInput,
  oldRoom: Room,
  newRoom: Room,
  existingBookings: Booking[],
  settings: PropertySettings,
): Promise<{ roomId: string; baseAmount: number }> {
  if (newRoom.id === booking.roomId) throw new Error('Guest is already in this room')
  if (newRoom.status !== 'available') throw new Error('Target room is not available')

  if (
    hasRoomConflict(
      existingBookings,
      input.newRoomId,
      booking.checkIn,
      booking.checkOut,
      booking.checkInTime,
      booking.checkOutTime,
      booking.id,
    )
  ) {
    throw new Error('Target room is booked for that time')
  }

  const baseAmount = calculateBookingTotal(settings.rates, newRoom, booking.rateType, {
    hours: booking.hours,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
  })

  const batch = writeBatch(db)
  batch.update(doc(db, 'properties', propertyId, 'bookings', booking.id), {
    roomId: input.newRoomId,
    baseAmount,
  })
  if (booking.status === 'checked_in') {
    batch.update(doc(db, 'properties', propertyId, 'rooms', oldRoom.id), { status: 'cleaning' })
    batch.update(doc(db, 'properties', propertyId, 'rooms', newRoom.id), { status: 'occupied' })
  } else if (booking.status === 'confirmed') {
    batch.update(doc(db, 'properties', propertyId, 'rooms', oldRoom.id), { status: 'available' })
    batch.update(doc(db, 'properties', propertyId, 'rooms', newRoom.id), { status: 'reserved' })
  }
  await batch.commit()

  return { roomId: input.newRoomId, baseAmount }
}

export async function addBookingChargeRecord(
  propertyId: string,
  booking: Booking,
  input: AddBookingChargeInput,
  actor: { uid: string; name: string },
): Promise<BookingCharge> {
  const charge: BookingCharge = {
    id: crypto.randomUUID(),
    description: input.description.trim(),
    amount: Math.max(0, input.amount),
    addedAt: new Date().toISOString(),
    addedBy: actor.uid,
    addedByName: actor.name,
  }
  const extraCharges = [...(booking.extraCharges ?? []), charge]
  const totalAmount = bookingTotalWithCharges(bookingBaseAmount(booking), extraCharges)
  const payment = normalizePayment(totalAmount, booking.amountPaid)

  await updateDoc(doc(db, 'properties', propertyId, 'bookings', booking.id), {
    extraCharges,
    totalAmount,
    ...payment,
  })
  return charge
}

export async function applyBookingExtension(
  propertyId: string,
  bookingId: string,
  updates: {
    checkOut: string
    checkOutTime?: string
    hours?: number
    baseAmount: number
    extraCharges?: BookingCharge[]
  },
): Promise<void> {
  const totalAmount = bookingTotalWithCharges(updates.baseAmount, updates.extraCharges)
  const snap = await getDoc(doc(db, 'properties', propertyId, 'bookings', bookingId))
  const amountPaid = (snap.data()?.amountPaid as number) ?? 0
  const payment = normalizePayment(totalAmount, amountPaid)

  await updateDoc(doc(db, 'properties', propertyId, 'bookings', bookingId), {
    checkOut: updates.checkOut,
    ...(updates.checkOutTime ? { checkOutTime: updates.checkOutTime } : {}),
    ...(updates.hours !== undefined ? { hours: updates.hours } : {}),
    baseAmount: updates.baseAmount,
    totalAmount,
    ...payment,
    isOverstay: false,
  })
}

// ── Guest folio ──────────────────────────────────────────────────

export async function syncPublicFolio(
  propertyId: string,
  booking: Booking,
  guest: Guest,
  room: Room,
  settings: PropertySettings,
): Promise<string> {
  const token = booking.folioToken ?? generateToken()
  const folio: PublicFolio = {
    propertyId,
    bookingId: booking.id,
    propertyName: settings.name,
    guestName: guest.name,
    roomNumber: room.number,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    checkInTime: booking.checkInTime,
    checkOutTime: booking.checkOutTime,
    baseAmount: bookingBaseAmount(booking),
    totalAmount: booking.totalAmount,
    amountPaid: booking.amountPaid,
    paymentStatus: booking.paymentStatus,
    extraCharges: booking.extraCharges ?? [],
    wifiPassword: settings.wifiPassword,
    propertyPhone: settings.phone,
    checkedOut: booking.status === 'checked_out',
    ...(settings.suggestionToken ? { suggestionToken: settings.suggestionToken } : {}),
    feedbackSubmitted: false,
  }
  await setDoc(doc(db, 'publicFolios', token), folio, { merge: true })
  if (!booking.folioToken) {
    await updateDoc(doc(db, 'properties', propertyId, 'bookings', booking.id), {
      folioToken: token,
    })
  }
  return token
}

export async function loadPublicFolio(token: string): Promise<PublicFolio | null> {
  const snap = await getDoc(doc(db, 'publicFolios', token))
  if (!snap.exists()) return null
  return snap.data() as PublicFolio
}

// ── Night audit ────────────────────────────────────────────────────

export async function runNightAudit(
  propertyId: string,
  auditDate: string,
  rooms: Room[],
  bookings: Booking[],
): Promise<NightAuditSnapshot> {
  const now = Date.now()
  let checkedOutCount = 0
  const overstayBookingIds: string[] = []
  const revenueToday = bookings
    .filter((b) => b.checkIn === auditDate && b.status !== 'cancelled')
    .reduce((sum, b) => sum + b.totalAmount, 0)

  const batch = writeBatch(db)
  const roomCol = collection(db, 'properties', propertyId, 'rooms')
  const bookingCol = collection(db, 'properties', propertyId, 'bookings')

  for (const booking of bookings) {
    if (booking.status !== 'checked_in') continue

    const { end } = bookingRangeMs(booking)
    if (end <= now) {
      batch.update(doc(bookingCol, booking.id), { status: 'checked_out', isOverstay: true })
      batch.update(doc(roomCol, booking.roomId), {
        status: 'cleaning',
        cleaningStartedAt: new Date().toISOString(),
      })
      checkedOutCount += 1
      overstayBookingIds.push(booking.id)
      const taskRef = doc(opsCollection(propertyId, 'housekeepingTasks'))
      batch.set(taskRef, {
        roomId: booking.roomId,
        checklist: makeChecklist(),
        status: 'pending',
        createdAt: new Date().toISOString(),
      })
    } else if (booking.checkOut < auditDate) {
      batch.update(doc(bookingCol, booking.id), { isOverstay: true })
      overstayBookingIds.push(booking.id)
    }
  }

  const occupiedRooms = rooms.filter((r) => r.status === 'occupied').length
  const snapshot: Omit<NightAuditSnapshot, 'id'> = {
    date: auditDate,
    runAt: new Date().toISOString(),
    occupancyPercent: rooms.length > 0 ? Math.round((occupiedRooms / rooms.length) * 100) : 0,
    occupiedRooms,
    totalRooms: rooms.length,
    checkedOutCount,
    overstayCount: overstayBookingIds.length,
    overstayBookingIds,
    revenueToday,
  }

  const auditRef = doc(opsCollection(propertyId, 'nightAudits'))
  batch.set(auditRef, snapshot)
  batch.update(doc(db, 'properties', propertyId), {
    'settings.lastNightAuditDate': auditDate,
  })
  await batch.commit()

  return { id: auditRef.id, ...snapshot }
}

export function shouldRunNightAudit(settings: PropertySettings): string | null {
  const yesterday = addDaysISO(todayISO(), -1)
  if (settings.lastNightAuditDate === yesterday) return null
  const hour = new Date().getHours()
  if (hour < 1) return null
  return yesterday
}
