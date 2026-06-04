import type { Booking, BookingRateType } from '../types'
import { isToday } from './dates'
import { RATE_TYPE_LABELS } from './pricing'

export interface TodayCashLine {
  bookingId: string
  guestName: string
  roomNumber: string
  rateType: BookingRateType
  totalAmount: number
  amountPaid: number
}

export interface TodayCashReport {
  date: string
  bookingCount: number
  totalBilled: number
  totalCollected: number
  outstanding: number
  byRateType: Record<BookingRateType, { count: number; billed: number; collected: number }>
  lines: TodayCashLine[]
}

export function buildTodayCashReport(
  bookings: Booking[],
  getGuestName: (guestId: string) => string,
  getRoomNumber: (roomId: string) => string,
  date = new Date().toISOString().split('T')[0],
): TodayCashReport {
  const todayActive = bookings.filter(
    (b) => isToday(b.checkIn) && b.status !== 'cancelled' && b.status !== 'checked_out',
  )

  const byRateType: TodayCashReport['byRateType'] = {
    full_day: { count: 0, billed: 0, collected: 0 },
    per_hour: { count: 0, billed: 0, collected: 0 },
    two_hours: { count: 0, billed: 0, collected: 0 },
  }

  let totalBilled = 0
  let totalCollected = 0

  const lines: TodayCashLine[] = todayActive.map((b) => {
    const paid = b.amountPaid ?? 0
    totalBilled += b.totalAmount
    totalCollected += paid
    const bucket = byRateType[b.rateType]
    bucket.count += 1
    bucket.billed += b.totalAmount
    bucket.collected += paid

    return {
      bookingId: b.id,
      guestName: getGuestName(b.guestId),
      roomNumber: getRoomNumber(b.roomId),
      rateType: b.rateType,
      totalAmount: b.totalAmount,
      amountPaid: paid,
    }
  })

  return {
    date,
    bookingCount: todayActive.length,
    totalBilled,
    totalCollected,
    outstanding: Math.max(0, totalBilled - totalCollected),
    byRateType,
    lines,
  }
}

export function rateTypeReportLabel(type: BookingRateType): string {
  return RATE_TYPE_LABELS[type]
}
