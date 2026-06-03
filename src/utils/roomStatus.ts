import type { BookingStatus, RoomStatus } from '../types'

export const roomStatusConfig: Record<
  RoomStatus,
  { label: string; dot: string; text: string }
> = {
  available: { label: 'Available', dot: 'bg-emerald-500', text: 'text-emerald-700' },
  occupied: { label: 'Occupied', dot: 'bg-rose-400', text: 'text-rose-700' },
  reserved: { label: 'Reserved', dot: 'bg-amber-400', text: 'text-amber-800' },
  cleaning: { label: 'Cleaning', dot: 'bg-sky-400', text: 'text-sky-700' },
  maintenance: { label: 'Maintenance', dot: 'bg-stone-400', text: 'text-stone-600' },
}

export const bookingStatusConfig: Record<
  BookingStatus,
  { label: string; className: string }
> = {
  confirmed: { label: 'Confirmed', className: 'bg-amber-50 text-amber-800' },
  checked_in: { label: 'In house', className: 'bg-emerald-50 text-emerald-800' },
  checked_out: { label: 'Departed', className: 'bg-stone-100 text-stone-600' },
  cancelled: { label: 'Cancelled', className: 'bg-stone-100 text-stone-500' },
}
