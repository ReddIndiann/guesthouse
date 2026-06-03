import type { Booking, PaymentStatus } from '../types'

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

export function normalizeBooking(data: Booking): Booking {
  const totalAmount = data.totalAmount ?? 0
  const amountPaid = data.amountPaid ?? 0
  const payment = normalizePayment(totalAmount, amountPaid, data.paymentStatus)
  return { ...data, totalAmount, ...payment }
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
  excludeBookingId?: string,
): boolean {
  return bookings.some(
    (b) =>
      b.roomId === roomId &&
      b.id !== excludeBookingId &&
      (b.status === 'confirmed' || b.status === 'checked_in') &&
      bookingsOverlap(b, { checkIn, checkOut }),
  )
}

export const paymentStatusConfig: Record<
  PaymentStatus,
  { label: string; className: string }
> = {
  unpaid: { label: 'Unpaid', className: 'bg-rose-50 text-rose-700' },
  partial: { label: 'Partial', className: 'bg-amber-50 text-amber-800' },
  paid: { label: 'Paid', className: 'bg-emerald-50 text-emerald-800' },
}
