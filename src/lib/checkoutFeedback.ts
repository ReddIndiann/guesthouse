import { doc, setDoc } from 'firebase/firestore'
import type { Booking, Guest, PropertySettings, Room } from '../types'
import { ensureSuggestionToken } from './suggestions'
import { syncPublicFolio } from './operations'
import { db } from './firebase'

export async function preparePostCheckoutFeedback(
  propertyId: string,
  booking: Booking,
  guest: Guest,
  room: Room,
  settings: PropertySettings,
): Promise<void> {
  const suggestionToken = await ensureSuggestionToken(propertyId, settings)

  if (booking.folioToken) {
    await setDoc(
      doc(db, 'publicFolios', booking.folioToken),
      {
        checkedOut: true,
        suggestionToken,
        feedbackSubmitted: false,
      },
      { merge: true },
    )
  } else {
    await syncPublicFolio(propertyId, { ...booking, status: 'checked_out' }, guest, room, {
      ...settings,
      suggestionToken,
    })
  }
}
