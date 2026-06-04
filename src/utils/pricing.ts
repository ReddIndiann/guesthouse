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
    nonAc: { ...DEFAULT_PROPERTY_RATES.nonAc, ...partial?.nonAc },
  }
}

export function roomHasAirConditioning(room: Pick<Room, 'hasAirConditioning' | 'amenities'>): boolean {
  if (room.hasAirConditioning !== undefined) return room.hasAirConditioning
  return room.amenities.some((a) => /\bac\b/i.test(a))
}

export function getRateBand(rates: PropertyRates, hasAirConditioning: boolean) {
  return hasAirConditioning ? rates.ac : rates.nonAc
}

export function calculateBookingTotal(
  rates: PropertyRates,
  hasAirConditioning: boolean,
  rateType: BookingRateType,
  options?: { hours?: number; checkIn?: string; checkOut?: string },
): number {
  const band = getRateBand(rates, hasAirConditioning)

  switch (rateType) {
    case 'full_day': {
      const nights =
        options?.checkIn && options?.checkOut
          ? nightsBetween(options.checkIn, options.checkOut)
          : 1
      return band.fullDay * nights
    }
    case 'two_hours':
      return band.twoHours
    case 'per_hour':
      return band.perHour * Math.max(1, options?.hours ?? 1)
  }
}

export function formatRateSummary(
  rates: PropertyRates,
  hasAirConditioning: boolean,
): string {
  const band = getRateBand(rates, hasAirConditioning)
  const label = hasAirConditioning ? 'AC' : 'Non-AC'
  return `${label}: ${band.fullDay}/day · ${band.twoHours}/2h · ${band.perHour}/hr`
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
