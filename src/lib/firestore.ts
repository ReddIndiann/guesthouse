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
import type { User } from 'firebase/auth'
import { seedDefaultRoles, ensureSystemAdminRole } from './accessControl'
import type { StaffProfile } from '../types/auth'
import { SYSTEM_ADMIN_ROLE_ID } from '../types/auth'
import type { Booking, Communication, Guest, MessageTemplate, MessageTemplateInput, NewBookingInput, NewCommunicationInput, PropertySettings, Room, RoomInput, RoomStatus } from '../types'
import { DEFAULT_PROPERTY_SETTINGS } from '../types'
import { hasRoomConflict, normalizeBooking, normalizePayment } from '../utils/bookings'
import { getDefaultMessageTemplates } from '../utils/communications'
import { nightsBetween, todayISO } from '../utils/dates'
import { db } from './firebase'

type PropertyCollection = 'rooms' | 'guests' | 'bookings' | 'communications' | 'messageTemplates'

function propertyDoc(propertyId: string) {
  return doc(db, 'properties', propertyId)
}

function propertyCollection(propertyId: string, name: PropertyCollection) {
  return collection(db, 'properties', propertyId, name)
}

function mapDoc<T extends { id: string }>(snap: QueryDocumentSnapshot<DocumentData>): T {
  return { id: snap.id, ...snap.data() } as T
}

export async function loadStaffProfile(uid: string): Promise<StaffProfile | null> {
  const snap = await getDoc(doc(db, 'staff', uid))
  if (!snap.exists()) return null
  const data = snap.data()
  return normalizeStaffProfile(uid, data)
}

function normalizeStaffProfile(uid: string, data: Record<string, unknown>): StaffProfile {
  if (data.assignmentType) {
    return { uid, ...data } as StaffProfile
  }

  const legacyRole = data.role as string | undefined
  const legacyMap: Record<string, string> = {
    admin: SYSTEM_ADMIN_ROLE_ID,
    manager: 'template-manager',
    receptionist: 'template-receptionist',
    viewer: 'template-viewer',
  }

  return {
    uid,
    email: (data.email as string) ?? '',
    displayName: (data.displayName as string) ?? '',
    propertyId: (data.propertyId as string) ?? '',
    assignmentType: 'direct',
    roleId: legacyRole ? legacyMap[legacyRole] ?? 'template-viewer' : undefined,
    createdAt: (data.createdAt as string) ?? new Date().toISOString(),
    createdBy: data.createdBy as string | undefined,
  }
}

export async function ensureStaffProfile(user: User): Promise<StaffProfile> {
  const existing = await loadStaffProfile(user.uid)
  if (existing) return existing

  const allStaff = await getDocs(collection(db, 'staff'))
  if (!allStaff.empty) {
    throw new Error('No access. Ask an administrator to create your account.')
  }

  const propertyId = user.uid
  await seedDefaultRoles(propertyId)
  await ensureSystemAdminRole(propertyId)

  const profile = {
    email: user.email ?? '',
    displayName: user.displayName ?? user.email?.split('@')[0] ?? 'Admin',
    assignmentType: 'direct' as const,
    roleId: SYSTEM_ADMIN_ROLE_ID,
    propertyId,
    createdAt: new Date().toISOString(),
  }

  await setDoc(doc(db, 'staff', user.uid), profile)
  await setDoc(propertyDoc(propertyId), { settings: DEFAULT_PROPERTY_SETTINGS }, { merge: true })
  return { uid: user.uid, ...profile }
}

export function subscribeToStaff(
  propertyId: string,
  onData: (staff: StaffProfile[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const q = query(collection(db, 'staff'), where('propertyId', '==', propertyId))
  return onSnapshot(
    q,
    (snapshot) =>
      onData(snapshot.docs.map((d) => normalizeStaffProfile(d.id, d.data() as Record<string, unknown>))),
    (err) => onError(err),
  )
}

export function subscribeToRooms(
  propertyId: string,
  onData: (rooms: Room[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    propertyCollection(propertyId, 'rooms'),
    (snapshot) => onData(snapshot.docs.map((d) => mapDoc<Room>(d))),
    (err) => onError(err),
  )
}

export function subscribeToGuests(
  propertyId: string,
  onData: (guests: Guest[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    propertyCollection(propertyId, 'guests'),
    (snapshot) => onData(snapshot.docs.map((d) => mapDoc<Guest>(d))),
    (err) => onError(err),
  )
}

export function subscribeToBookings(
  propertyId: string,
  onData: (bookings: Booking[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    propertyCollection(propertyId, 'bookings'),
    (snapshot) => onData(snapshot.docs.map((d) => normalizeBooking(mapDoc<Booking>(d)))),
    (err) => onError(err),
  )
}

export function subscribeToPropertySettings(
  propertyId: string,
  onData: (settings: PropertySettings) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    propertyDoc(propertyId),
    (snapshot) => {
      const data = snapshot.data()
      onData({ ...DEFAULT_PROPERTY_SETTINGS, ...(data?.settings as Partial<PropertySettings> | undefined) })
    },
    (err) => onError(err),
  )
}

export async function updatePropertySettings(
  propertyId: string,
  settings: PropertySettings,
): Promise<void> {
  await setDoc(propertyDoc(propertyId), { settings }, { merge: true })
}

export function subscribeToCommunications(
  propertyId: string,
  onData: (items: Communication[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    propertyCollection(propertyId, 'communications'),
    (snapshot) => {
      const items = snapshot.docs.map((d) => mapDoc<Communication>(d))
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      onData(items)
    },
    (err) => onError(err),
  )
}

export async function createCommunicationRecord(
  propertyId: string,
  input: NewCommunicationInput,
): Promise<string> {
  const ref = doc(propertyCollection(propertyId, 'communications'))
  await setDoc(ref, {
    type: input.type,
    guestId: input.guestId,
    recipient: input.recipient.trim(),
    body: input.body.trim(),
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy,
    createdByName: input.createdByName,
    ...(input.subject ? { subject: input.subject.trim() } : {}),
  })
  return ref.id
}

export function subscribeToMessageTemplates(
  propertyId: string,
  onData: (templates: MessageTemplate[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    propertyCollection(propertyId, 'messageTemplates'),
    (snapshot) => {
      const templates = snapshot.docs.map((d) => mapDoc<MessageTemplate>(d))
      templates.sort((a, b) => a.name.localeCompare(b.name))
      onData(templates)
    },
    (err) => onError(err),
  )
}

export async function createMessageTemplateRecord(
  propertyId: string,
  input: MessageTemplateInput,
): Promise<string> {
  const ref = doc(propertyCollection(propertyId, 'messageTemplates'))
  await setDoc(ref, {
    type: input.type,
    name: input.name.trim(),
    body: input.body.trim(),
    createdAt: new Date().toISOString(),
    ...(input.type === 'email' && input.subject ? { subject: input.subject.trim() } : {}),
  })
  return ref.id
}

export async function updateMessageTemplateRecord(
  propertyId: string,
  templateId: string,
  input: MessageTemplateInput,
): Promise<void> {
  await updateDoc(doc(propertyCollection(propertyId, 'messageTemplates'), templateId), {
    type: input.type,
    name: input.name.trim(),
    body: input.body.trim(),
    ...(input.type === 'email' ? { subject: input.subject?.trim() ?? '' } : { subject: deleteField() }),
  })
}

export async function deleteMessageTemplateRecord(
  propertyId: string,
  templateId: string,
): Promise<void> {
  await deleteDoc(doc(propertyCollection(propertyId, 'messageTemplates'), templateId))
}

export async function ensureDefaultMessageTemplates(propertyId: string): Promise<void> {
  const snap = await getDocs(propertyCollection(propertyId, 'messageTemplates'))
  if (!snap.empty) return

  const batch = writeBatch(db)
  const now = new Date().toISOString()
  for (const template of getDefaultMessageTemplates()) {
    const ref = doc(propertyCollection(propertyId, 'messageTemplates'))
    batch.set(ref, {
      ...template,
      createdAt: now,
    })
  }
  await batch.commit()
}

export async function updateRoomStatus(
  propertyId: string,
  roomId: string,
  status: RoomStatus,
): Promise<void> {
  await updateDoc(doc(propertyCollection(propertyId, 'rooms'), roomId), { status })
}

export async function markRoomReady(propertyId: string, roomId: string): Promise<void> {
  await updateRoomStatus(propertyId, roomId, 'available')
}

export async function updateBookingPayment(
  propertyId: string,
  bookingId: string,
  amountPaid: number,
  totalAmount: number,
): Promise<void> {
  const payment = normalizePayment(totalAmount, amountPaid)
  await updateDoc(doc(propertyCollection(propertyId, 'bookings'), bookingId), payment)
}

export async function createRoomRecord(propertyId: string, input: RoomInput): Promise<string> {
  const ref = doc(propertyCollection(propertyId, 'rooms'))
  await setDoc(ref, {
    number: input.number.trim(),
    floor: input.floor,
    type: input.type,
    status: 'available' as const,
    pricePerNight: input.pricePerNight,
    capacity: input.capacity,
    amenities: input.amenities,
  })
  return ref.id
}

export async function updateRoomRecord(
  propertyId: string,
  roomId: string,
  input: RoomInput,
): Promise<void> {
  await updateDoc(doc(propertyCollection(propertyId, 'rooms'), roomId), {
    number: input.number.trim(),
    floor: input.floor,
    type: input.type,
    pricePerNight: input.pricePerNight,
    capacity: input.capacity,
    amenities: input.amenities,
  })
}

export async function deleteRoomRecord(propertyId: string, roomId: string): Promise<void> {
  await deleteDoc(doc(propertyCollection(propertyId, 'rooms'), roomId))
}

export async function clearPropertyData(propertyId: string): Promise<void> {
  for (const name of ['bookings', 'guests', 'rooms'] as PropertyCollection[]) {
    const snap = await getDocs(propertyCollection(propertyId, name))
    if (snap.empty) continue

    const batch = writeBatch(db)
    for (const docSnap of snap.docs) {
      batch.delete(docSnap.ref)
    }
    await batch.commit()
  }
}

export async function checkInBooking(
  propertyId: string,
  bookingId: string,
  roomId: string,
): Promise<void> {
  const batch = writeBatch(db)
  batch.update(doc(propertyCollection(propertyId, 'bookings'), bookingId), {
    status: 'checked_in',
  })
  batch.update(doc(propertyCollection(propertyId, 'rooms'), roomId), { status: 'occupied' })
  await batch.commit()
}

export async function checkOutBooking(
  propertyId: string,
  bookingId: string,
  roomId: string,
): Promise<void> {
  const batch = writeBatch(db)
  batch.update(doc(propertyCollection(propertyId, 'bookings'), bookingId), {
    status: 'checked_out',
  })
  batch.update(doc(propertyCollection(propertyId, 'rooms'), roomId), { status: 'cleaning' })
  await batch.commit()
}

export async function cancelBookingRecord(
  propertyId: string,
  bookingId: string,
  roomId: string,
  roomStatus: RoomStatus,
): Promise<void> {
  const batch = writeBatch(db)
  batch.update(doc(propertyCollection(propertyId, 'bookings'), bookingId), {
    status: 'cancelled',
  })
  if (roomStatus !== 'occupied') {
    batch.update(doc(propertyCollection(propertyId, 'rooms'), roomId), { status: 'available' })
  }
  await batch.commit()
}

export async function createBookingRecord(
  propertyId: string,
  input: NewBookingInput,
  room: Room,
  existingBookings: Booking[],
): Promise<void> {
  if (hasRoomConflict(existingBookings, input.roomId, input.checkIn, input.checkOut)) {
    throw new Error('This room is already booked for those dates')
  }

  const guestRef = doc(propertyCollection(propertyId, 'guests'))
  const bookingRef = doc(propertyCollection(propertyId, 'bookings'))
  const nights = nightsBetween(input.checkIn, input.checkOut)
  const checkInToday = input.checkIn === todayISO()
  const totalAmount = nights * room.pricePerNight

  const guestData = {
    name: input.guest.name,
    email: input.guest.email,
    phone: input.guest.phone,
    ...(input.guest.idNumber ? { idNumber: input.guest.idNumber } : {}),
  }

  const bookingData = {
    guestId: guestRef.id,
    roomId: input.roomId,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    status: checkInToday ? 'checked_in' : 'confirmed',
    totalAmount,
    amountPaid: 0,
    paymentStatus: 'unpaid' as const,
    ...(input.notes ? { notes: input.notes } : {}),
  }

  const batch = writeBatch(db)
  batch.set(guestRef, guestData)
  batch.set(bookingRef, bookingData)
  batch.update(doc(propertyCollection(propertyId, 'rooms'), input.roomId), {
    status: checkInToday ? 'occupied' : 'reserved',
  })
  await batch.commit()
}
