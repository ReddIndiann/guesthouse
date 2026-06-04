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
}

export interface Guest {
  id: string
  name: string
  email: string
  phone: string
  idNumber?: string
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
  totalAmount: number
  amountPaid: number
  paymentStatus: PaymentStatus
  notes?: string
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
