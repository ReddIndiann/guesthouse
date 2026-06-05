export type RoomStatus = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'maintenance'

export type RoomType = 'single' | 'double' | 'twin' | 'suite' | 'dorm'

export type BookingStatus = 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled'

export type PaymentStatus = 'unpaid' | 'partial' | 'paid'

export type BookingRateType = 'full_day' | 'per_hour' | 'two_hours'

export interface RoomRateBand {
  fullDay: number
  perHour: number
  twoHours: number
}

export interface PropertyRates {
  ac: RoomRateBand
  nonAc: RoomRateBand
}

export const DEFAULT_PROPERTY_RATES: PropertyRates = {
  ac: { fullDay: 250, perHour: 70, twoHours: 100 },
  nonAc: { fullDay: 200, perHour: 50, twoHours: 80 },
}

export interface PropertySettings {
  name: string
  address: string
  phone: string
  checkInTime: string
  checkOutTime: string
  rates: PropertyRates
  wifiPassword?: string
  lastNightAuditDate?: string
}

export const DEFAULT_PROPERTY_SETTINGS: PropertySettings = {
  name: 'My Guest House',
  address: '',
  phone: '',
  checkInTime: '14:00',
  checkOutTime: '11:00',
  rates: DEFAULT_PROPERTY_RATES,
}

export interface Room {
  id: string
  number: string
  floor: number
  type: RoomType
  status: RoomStatus
  hasAirConditioning: boolean
  /** @deprecated Legacy field — pricing uses property rates */
  pricePerNight?: number
  capacity: number
  amenities: string[]
  cleaningStartedAt?: string
}

export interface Guest {
  id: string
  name: string
  email: string
  phone: string
  idNumber?: string
}

export interface BookingCharge {
  id: string
  description: string
  amount: number
  addedAt: string
  addedBy: string
  addedByName: string
}

export interface Booking {
  id: string
  guestId: string
  roomId: string
  checkIn: string
  checkOut: string
  checkInTime?: string
  checkOutTime?: string
  rateType: BookingRateType
  hours?: number
  status: BookingStatus
  baseAmount?: number
  totalAmount: number
  amountPaid: number
  paymentStatus: PaymentStatus
  extraCharges?: BookingCharge[]
  folioToken?: string
  isOverstay?: boolean
  notes?: string
}

export interface PublicFolio {
  propertyId: string
  bookingId: string
  propertyName: string
  guestName: string
  roomNumber: string
  checkIn: string
  checkOut: string
  checkInTime?: string
  checkOutTime?: string
  baseAmount: number
  totalAmount: number
  amountPaid: number
  paymentStatus: PaymentStatus
  extraCharges: BookingCharge[]
  wifiPassword?: string
  propertyPhone?: string
}

export interface NewBookingInput {
  guest: Omit<Guest, 'id'>
  roomId: string
  checkIn: string
  checkOut: string
  checkInTime?: string
  checkOutTime?: string
  rateType: BookingRateType
  hours?: number
  amountPaid?: number
  walkIn?: boolean
  notes?: string
}

export interface RoomInput {
  number: string
  floor: number
  type: RoomType
  hasAirConditioning: boolean
  capacity: number
  amenities: string[]
}

export const ROOM_TYPES: RoomType[] = ['single', 'double', 'twin', 'suite', 'dorm']

export type CommunicationType = 'email' | 'sms'

export interface Communication {
  id: string
  type: CommunicationType
  guestId: string
  recipient: string
  subject?: string
  body: string
  createdAt: string
  createdBy: string
  createdByName: string
}

export interface NewCommunicationInput {
  type: CommunicationType
  guestId: string
  recipient: string
  subject?: string
  body: string
  createdBy: string
  createdByName: string
}

export interface MessageTemplate {
  id: string
  type: CommunicationType
  name: string
  subject?: string
  body: string
  createdAt: string
}

export interface MessageTemplateInput {
  type: CommunicationType
  name: string
  subject?: string
  body: string
}

export interface HousekeepingChecklistItem {
  id: string
  label: string
  done: boolean
}

export type HousekeepingTaskStatus = 'pending' | 'in_progress' | 'completed'

export interface HousekeepingTask {
  id: string
  roomId: string
  checklist: HousekeepingChecklistItem[]
  assignedTo?: string
  assignedToName?: string
  status: HousekeepingTaskStatus
  startedAt?: string
  completedAt?: string
  createdAt: string
}

export const DEFAULT_HOUSEKEEPING_CHECKLIST = [
  'Change linens',
  'Clean bathroom',
  'Restock towels',
  'Check minibar',
  'Vacuum / mop floor',
]

export type MaintenanceTicketStatus = 'open' | 'in_progress' | 'resolved'
export type MaintenancePriority = 'low' | 'medium' | 'high'

export interface MaintenanceTicket {
  id: string
  roomId: string
  title: string
  description: string
  status: MaintenanceTicketStatus
  priority: MaintenancePriority
  reportedBy: string
  reportedByName: string
  assignedTo?: string
  assignedToName?: string
  createdAt: string
  resolvedAt?: string
}

export type ActivityEntityType =
  | 'booking'
  | 'room'
  | 'guest'
  | 'housekeeping'
  | 'maintenance'
  | 'shift'
  | 'system'

export interface ActivityLogEntry {
  id: string
  action: string
  entityType: ActivityEntityType
  entityId?: string
  details?: string
  performedBy: string
  performedByName: string
  shiftId?: string
  createdAt: string
}

export interface StaffShift {
  id: string
  staffId: string
  staffName: string
  date: string
  startTime: string
  endTime: string
  role?: string
  createdAt: string
}

export interface NightAuditSnapshot {
  id: string
  date: string
  runAt: string
  occupancyPercent: number
  occupiedRooms: number
  totalRooms: number
  checkedOutCount: number
  overstayCount: number
  overstayBookingIds: string[]
  revenueToday: number
}

export type BookingExtendOption = 'two_hours' | 'one_night' | 'custom_hours'

export interface ExtendBookingInput {
  option: BookingExtendOption
  customHours?: number
}

export interface AddBookingChargeInput {
  description: string
  amount: number
}

export interface ChangeBookingRoomInput {
  newRoomId: string
}
