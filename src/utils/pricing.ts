import type { BookingRateType, PropertyRates, Room } from '../types'
import { DEFAULT_PROPERTY_RATES } from '../types'
import { nightsBetween } from './dates'

export const RATE_TYPE_LABELS: Record<BookingRateType, string> = {
  full_day: 'Full day',
  per_hour: 'Per hour',
  two_hours: '2 hours',
}

export function mergePropertyRates(partial?: Partial<PropertyRates>): PropertyRates {
  return {
    ac: { ...DEFAULT_PROPERTY_RATES.ac, ...partial?.ac },
    acKing: { ...DEFAULT_PROPERTY_RATES.acKing, ...partial?.acKing },
    nonAc: { ...DEFAULT_PROPERTY_RATES.nonAc, ...partial?.nonAc },
  }
}

export function roomHasAirConditioning(room: Pick<Room, 'hasAirConditioning' | 'amenities'>): boolean {
  if (room.hasAirConditioning !== undefined) return room.hasAirConditioning
  return room.amenities.some((a) => /\bac\b/i.test(a))
}

export function getRateBand(rates: PropertyRates, room: Pick<Room, 'hasAirConditioning' | 'amenities' | 'type'>) {
  if (room.type === 'suite' && roomHasAirConditioning(room)) {
    return rates.acKing || rates.ac
  }
  return roomHasAirConditioning(room) ? rates.ac : rates.nonAc
}

export function calculateBookingTotal(
  rates: PropertyRates,
  room: Pick<Room, 'hasAirConditioning' | 'amenities' | 'type'>,
  rateType: BookingRateType,
  options?: { hours?: number; checkIn?: string; checkOut?: string },
): number {
  const band = getRateBand(rates, room)

  switch (rateType) {
    case 'full_day': {
      const nights =
        options?.checkIn && options?.checkOut
          ? Math.max(1, nightsBetween(options.checkIn, options.checkOut))
          : 1
      return band.fullDay * nights
    }
    case 'two_hours':
      return band.twoHours
    case 'per_hour': {
      const h = Math.max(1, options?.hours ?? 1)
      if (h === 1) return band.oneHour
      if (h === 2) return band.twoHours
      return band.threeHours + (h - 3) * (band.threeHours - band.twoHours)
    }
  }
}

export function formatRateSummary(
  rates: PropertyRates,
  room: Pick<Room, 'hasAirConditioning' | 'amenities' | 'type'>,
): string {
  const band = getRateBand(rates, room)
  const isAcKing = room.type === 'suite' && roomHasAirConditioning(room)
  const label = isAcKing ? 'AC King' : roomHasAirConditioning(room) ? 'AC' : 'Non-AC'
  return `${label}: ${band.fullDay}/day · ${band.twoHours}/2h · ${band.oneHour}/hr`
}

export function formatBookingRateLabel(
  rateType: BookingRateType,
  hours?: number,
): string {
  if (rateType === 'per_hour' && hours) {
    return `${RATE_TYPE_LABELS.per_hour} (${hours}h)`
  }
  return RATE_TYPE_LABELS[rateType]
}
