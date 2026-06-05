import type { Booking, BookingRateType, Room } from '../types'
import { bookingRangeMs } from './datetime'
import { addDaysISO, nightsBetween } from './dates'

export interface PeriodAnalytics {
  startDate: string
  endDate: string
  occupancyPercent: number
  totalRevenue: number
  collectedRevenue: number
  bookingCount: number
  averageStayHours: number
  byRateType: Record<
    BookingRateType,
    { count: number; revenue: number; collected: number }
  >
  topRooms: { roomId: string; roomNumber: string; revenue: number; stays: number }[]
}

function bookingStayHours(booking: Booking): number {
  const { start, end } = bookingRangeMs(booking)
  return Math.max(0.5, (end - start) / (1000 * 60 * 60))
}

function bookingInPeriod(booking: Booking, startDate: string, endDate: string): boolean {
  if (booking.status === 'cancelled') return false
  return booking.checkIn <= endDate && booking.checkOut >= startDate
}

export function buildPeriodAnalytics(
  bookings: Booking[],
  rooms: Room[],
  getRoomNumber: (roomId: string) => string,
  startDate: string,
  endDate: string,
): PeriodAnalytics {
  const active = bookings.filter((b) => bookingInPeriod(b, startDate, endDate))

  const byRateType: PeriodAnalytics['byRateType'] = {
    full_day: { count: 0, revenue: 0, collected: 0 },
    per_hour: { count: 0, revenue: 0, collected: 0 },
    two_hours: { count: 0, revenue: 0, collected: 0 },
  }

  let totalRevenue = 0
  let collectedRevenue = 0
  let stayHoursSum = 0

  const roomStats = new Map<string, { revenue: number; stays: number }>()

  for (const b of active) {
    totalRevenue += b.totalAmount
    collectedRevenue += b.amountPaid ?? 0
    stayHoursSum += bookingStayHours(b)

    const bucket = byRateType[b.rateType]
    bucket.count += 1
    bucket.revenue += b.totalAmount
    bucket.collected += b.amountPaid ?? 0

    const existing = roomStats.get(b.roomId) ?? { revenue: 0, stays: 0 }
    existing.revenue += b.totalAmount
    existing.stays += 1
    roomStats.set(b.roomId, existing)
  }

  const periodDays = Math.max(1, nightsBetween(startDate, addDaysISO(endDate, 1)))
  const roomNightsCapacity = rooms.length * periodDays
  const occupiedNights = active.reduce((sum, b) => {
    const overlapStart = b.checkIn < startDate ? startDate : b.checkIn
    const overlapEnd = b.checkOut > endDate ? endDate : b.checkOut
    return sum + Math.max(0, nightsBetween(overlapStart, addDaysISO(overlapEnd, 1)))
  }, 0)

  const topRooms = [...roomStats.entries()]
    .map(([roomId, stats]) => ({
      roomId,
      roomNumber: getRoomNumber(roomId),
      revenue: stats.revenue,
      stays: stats.stays,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  return {
    startDate,
    endDate,
    occupancyPercent:
      roomNightsCapacity > 0 ? Math.round((occupiedNights / roomNightsCapacity) * 100) : 0,
    totalRevenue,
    collectedRevenue,
    bookingCount: active.length,
    averageStayHours: active.length > 0 ? Math.round(stayHoursSum / active.length) : 0,
    byRateType,
    topRooms,
  }
}

export function weekStartFrom(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  return date.toISOString().split('T')[0]
}

export function monthStartFrom(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00')
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
}
