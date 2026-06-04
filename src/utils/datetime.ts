import type { Booking, BookingRateType, PropertySettings } from '../types'
import { addDaysISO, todayISO } from './dates'

export interface BookingSlot {
  checkIn: string
  checkOut: string
  checkInTime: string
  checkOutTime: string
}

export interface BookingTimeRange {
  checkIn: string
  checkOut: string
  checkInTime?: string
  checkOutTime?: string
}

export function nowTimeString(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function parseTimeMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

export function formatTime12(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const hour = h ?? 0
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 || 12
  return `${h12}:${String(m ?? 0).padStart(2, '0')} ${ampm}`
}

export function addMinutesToTime(time: string, minutes: number): { time: string; dayOffset: number } {
  const total = parseTimeMinutes(time) + minutes
  const dayOffset = Math.floor(total / (24 * 60))
  const remainder = ((total % (24 * 60)) + 24 * 60) % (24 * 60)
  const h = Math.floor(remainder / 60)
  const m = remainder % 60
  return {
    time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
    dayOffset,
  }
}

export function computeBookingSlot(
  rateType: BookingRateType,
  checkInDate: string,
  checkInTime: string,
  settings: PropertySettings,
  hours?: number,
): BookingSlot {
  if (rateType === 'full_day') {
    return {
      checkIn: checkInDate,
      checkOut: addDaysISO(checkInDate, 1),
      checkInTime: settings.checkInTime,
      checkOutTime: settings.checkOutTime,
    }
  }

  if (rateType === 'two_hours') {
    const end = addMinutesToTime(checkInTime, 120)
    return {
      checkIn: checkInDate,
      checkOut: end.dayOffset > 0 ? addDaysISO(checkInDate, end.dayOffset) : checkInDate,
      checkInTime,
      checkOutTime: end.time,
    }
  }

  const end = addMinutesToTime(checkInTime, Math.max(1, hours ?? 1) * 60)
  return {
    checkIn: checkInDate,
    checkOut: end.dayOffset > 0 ? addDaysISO(checkInDate, end.dayOffset) : checkInDate,
    checkInTime,
    checkOutTime: end.time,
  }
}

export function bookingRangeMs(range: BookingTimeRange): { start: number; end: number } {
  const startTime = range.checkInTime ?? '00:00'
  const endTime = range.checkOutTime ?? '23:59'
  const start = new Date(`${range.checkIn}T${startTime}:00`).getTime()
  let end = new Date(`${range.checkOut}T${endTime}:00`).getTime()
  if (end <= start) {
    end = new Date(`${addDaysISO(range.checkOut, 1)}T${endTime}:00`).getTime()
  }
  return { start, end }
}

export function bookingsOverlapTimed(a: BookingTimeRange, b: BookingTimeRange): boolean {
  const ra = bookingRangeMs(a)
  const rb = bookingRangeMs(b)
  return ra.start < rb.end && rb.start < ra.end
}

export function formatBookingSchedule(booking: Booking): string {
  const sameDay = booking.checkIn === booking.checkOut
  const datePart = sameDay
    ? new Date(booking.checkIn + 'T12:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : `${booking.checkIn} → ${booking.checkOut}`

  if (booking.checkInTime && booking.checkOutTime) {
    return `${datePart} · ${formatTime12(booking.checkInTime)} – ${formatTime12(booking.checkOutTime)}`
  }
  return datePart
}

export function isBookingEndingSoon(booking: Booking, withinMinutes = 30): boolean {
  if (booking.status !== 'checked_in' || !booking.checkOutTime) return false
  const { end } = bookingRangeMs(booking)
  const now = Date.now()
  return now < end && end - now <= withinMinutes * 60 * 1000
}

export function defaultWalkInSlot(
  rateType: BookingRateType,
  settings: PropertySettings,
  hours?: number,
): BookingSlot {
  return computeBookingSlot(rateType, todayISO(), nowTimeString(), settings, hours)
}
