import type { Booking, Guest, Room } from '../types'

export const initialRooms: Room[] = [
  { id: 'r1', number: '101', floor: 1, type: 'single', status: 'occupied', hasAirConditioning: true, capacity: 1, amenities: ['WiFi', 'AC', 'TV'] },
  { id: 'r2', number: '102', floor: 1, type: 'double', status: 'available', hasAirConditioning: true, capacity: 2, amenities: ['WiFi', 'AC', 'TV', 'Mini bar'] },
  { id: 'r3', number: '103', floor: 1, type: 'twin', status: 'cleaning', hasAirConditioning: true, capacity: 2, amenities: ['WiFi', 'AC'] },
  { id: 'r4', number: '201', floor: 2, type: 'double', status: 'reserved', hasAirConditioning: true, capacity: 2, amenities: ['WiFi', 'AC', 'TV', 'Balcony'] },
  { id: 'r5', number: '202', floor: 2, type: 'suite', status: 'occupied', hasAirConditioning: true, capacity: 4, amenities: ['WiFi', 'AC', 'TV', 'Kitchen', 'Balcony'] },
  { id: 'r6', number: '203', floor: 2, type: 'single', status: 'available', hasAirConditioning: true, capacity: 1, amenities: ['WiFi', 'AC'] },
  { id: 'r7', number: '301', floor: 3, type: 'dorm', status: 'available', hasAirConditioning: false, capacity: 6, amenities: ['WiFi', 'Lockers'] },
  { id: 'r8', number: '302', floor: 3, type: 'double', status: 'maintenance', hasAirConditioning: true, capacity: 2, amenities: ['WiFi', 'AC', 'TV'] },
]

export const initialGuests: Guest[] = [
  { id: 'g1', name: 'Sarah Johnson', email: 'sarah.j@email.com', phone: '+1 555-0101', idNumber: 'DL-8821' },
  { id: 'g2', name: 'Marco Rossi', email: 'marco.r@email.com', phone: '+39 333-4422', idNumber: 'IT-9912' },
  { id: 'g3', name: 'Emily Chen', email: 'emily.c@email.com', phone: '+1 555-0199' },
  { id: 'g4', name: 'James Wilson', email: 'j.wilson@email.com', phone: '+44 7700-900123', idNumber: 'PP-4412' },
]

const today = new Date()
const tomorrow = new Date(today)
tomorrow.setDate(tomorrow.getDate() + 1)
const inThreeDays = new Date(today)
inThreeDays.setDate(inThreeDays.getDate() + 3)
const yesterday = new Date(today)
yesterday.setDate(yesterday.getDate() - 1)

const fmt = (d: Date) => d.toISOString().split('T')[0]

export const initialBookings: Booking[] = [
  { id: 'b1', guestId: 'g1', roomId: 'r1', checkIn: fmt(yesterday), checkOut: fmt(tomorrow), checkInTime: '14:00', checkOutTime: '11:00', rateType: 'full_day', status: 'checked_in', totalAmount: 500, amountPaid: 250, paymentStatus: 'partial', notes: 'Late arrival' },
  { id: 'b2', guestId: 'g2', roomId: 'r5', checkIn: fmt(yesterday), checkOut: fmt(inThreeDays), checkInTime: '14:00', checkOutTime: '11:00', rateType: 'full_day', status: 'checked_in', totalAmount: 750, amountPaid: 0, paymentStatus: 'unpaid' },
  { id: 'b3', guestId: 'g3', roomId: 'r4', checkIn: fmt(tomorrow), checkOut: fmt(inThreeDays), checkInTime: '14:00', checkOutTime: '11:00', rateType: 'full_day', status: 'confirmed', totalAmount: 500, amountPaid: 0, paymentStatus: 'unpaid' },
  { id: 'b4', guestId: 'g4', roomId: 'r2', checkIn: fmt(today), checkOut: fmt(today), checkInTime: '10:00', checkOutTime: '12:00', rateType: 'two_hours', status: 'confirmed', totalAmount: 100, amountPaid: 100, paymentStatus: 'paid' },
]
