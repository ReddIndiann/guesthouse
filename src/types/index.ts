export type RoomStatus = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'maintenance'

export type RoomType = 'single' | 'double' | 'twin' | 'suite' | 'dorm'

export type BookingStatus = 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled'

export type PaymentStatus = 'unpaid' | 'partial' | 'paid'

export interface PropertySettings {
  name: string
  address: string
  phone: string
  checkInTime: string
  checkOutTime: string
}

export const DEFAULT_PROPERTY_SETTINGS: PropertySettings = {
  name: 'My Guest House',
  address: '',
  phone: '',
  checkInTime: '14:00',
  checkOutTime: '11:00',
}

export interface Room {
  id: string
  number: string
  floor: number
  type: RoomType
  status: RoomStatus
  pricePerNight: number
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
  notes?: string
}

export interface RoomInput {
  number: string
  floor: number
  type: RoomType
  pricePerNight: number
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
