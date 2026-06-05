import type { Booking, PaymentStatus } from '../types'
import { bookingsOverlapTimed, type BookingTimeRange } from './datetime'

export function sumExtraCharges(charges?: Booking['extraCharges']): number {
  return (charges ?? []).reduce((sum, c) => sum + c.amount, 0)
}

export function bookingBaseAmount(data: Booking): number {
  if (data.baseAmount !== undefined) return data.baseAmount
  return Math.max(0, (data.totalAmount ?? 0) - sumExtraCharges(data.extraCharges))
}

export function bookingTotalWithCharges(baseAmount: number, charges?: Booking['extraCharges']): number {
  return baseAmount + sumExtraCharges(charges)
}

export function normalizeBooking(data: Booking): Booking {
  const baseAmount = bookingBaseAmount(data)
  const totalAmount = bookingTotalWithCharges(baseAmount, data.extraCharges)
  const amountPaid = data.amountPaid ?? 0
  const payment = normalizePayment(totalAmount, amountPaid, data.paymentStatus)
  return {
    ...data,
    rateType: data.rateType ?? 'full_day',
    baseAmount,
    totalAmount,
    extraCharges: data.extraCharges ?? [],
    ...payment,
  }
}

function toTimeRange(
  checkIn: string,
  checkOut: string,
  checkInTime?: string,
  checkOutTime?: string,
): BookingTimeRange {
  return { checkIn, checkOut, checkInTime, checkOutTime }
}

export function normalizePayment(
  totalAmount: number,
  amountPaid = 0,
  paymentStatus?: PaymentStatus,
): { amountPaid: number; paymentStatus: PaymentStatus } {
  if (paymentStatus) return { amountPaid, paymentStatus }
  if (amountPaid <= 0) return { amountPaid: 0, paymentStatus: 'unpaid' }
  if (amountPaid >= totalAmount) return { amountPaid, paymentStatus: 'paid' }
  return { amountPaid, paymentStatus: 'partial' }
}

export function bookingsOverlap(
  a: { checkIn: string; checkOut: string },
  b: { checkIn: string; checkOut: string },
): boolean {
  return a.checkIn < b.checkOut && b.checkIn < a.checkOut
}

export function hasRoomConflict(
  bookings: Booking[],
  roomId: string,
  checkIn: string,
  checkOut: string,
  checkInTime?: string,
  checkOutTime?: string,
  excludeBookingId?: string,
): boolean {
  const candidate = toTimeRange(checkIn, checkOut, checkInTime, checkOutTime)
  return bookings.some((b) => {
    if (b.roomId !== roomId || b.id === excludeBookingId) return false
    if (b.status !== 'confirmed' && b.status !== 'checked_in') return false
    if (checkInTime || checkOutTime || b.checkInTime || b.checkOutTime) {
      return bookingsOverlapTimed(candidate, b)
    }
    return bookingsOverlap(b, { checkIn, checkOut })
  })
}

export const paymentStatusConfig: Record<
  PaymentStatus,
  { label: string; className: string }
> = {
  unpaid: { label: 'Unpaid', className: 'bg-rose-50 text-rose-700' },
  partial: { label: 'Partial', className: 'bg-amber-50 text-amber-800' },
  paid: { label: 'Paid', className: 'bg-emerald-50 text-emerald-800' },
}
