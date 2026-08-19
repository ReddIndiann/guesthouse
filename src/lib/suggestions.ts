import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore'
import type { GuestSuggestion, NewGuestSuggestionInput, PublicSuggestionForm, PropertySettings } from '../types'
import { db } from './firebase'

function generateToken(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16)
}

export function suggestionFormUrl(
  token: string,
  params?: {
    name?: string
    room?: string
    bookingId?: string
    checkout?: boolean
  },
): string {
  const url = new URL(`${window.location.origin}/suggestions/${token}`)
  if (params?.name) url.searchParams.set('name', params.name)
  if (params?.room) url.searchParams.set('room', params.room)
  if (params?.bookingId) url.searchParams.set('booking', params.bookingId)
  if (params?.checkout) url.searchParams.set('checkout', '1')
  return url.toString()
}

export async function ensureSuggestionToken(
  propertyId: string,
  settings: PropertySettings,
): Promise<string> {
  const token = settings.suggestionToken ?? generateToken()
  const formRef = doc(db, 'publicSuggestionForms', token)

  if (!settings.suggestionToken) {
    await setDoc(formRef, {
      propertyId,
      propertyName: settings.name,
    })
    await updateDoc(doc(db, 'properties', propertyId), {
      'settings.suggestionToken': token,
    })
  } else {
    await setDoc(
      formRef,
      { propertyId, propertyName: settings.name },
      { merge: true },
    )
  }

  return token
}

export async function loadPublicSuggestionForm(token: string): Promise<PublicSuggestionForm | null> {
  const snap = await getDoc(doc(db, 'publicSuggestionForms', token))
  if (!snap.exists()) return null
  return snap.data() as PublicSuggestionForm
}

export async function submitGuestSuggestion(input: NewGuestSuggestionInput): Promise<void> {
  const ref = doc(collection(db, 'guestSuggestions'))
  await setDoc(ref, {
    token: input.token,
    propertyId: input.propertyId,
    propertyName: input.propertyName,
    message: input.message.trim(),
    createdAt: new Date().toISOString(),
    read: false,
    ...(input.name?.trim() ? { name: input.name.trim() } : {}),
    ...(input.roomNumber?.trim() ? { roomNumber: input.roomNumber.trim() } : {}),
    ...(input.rating ? { rating: input.rating } : {}),
    ...(input.bookingId ? { bookingId: input.bookingId } : {}),
    ...(input.source ? { source: input.source } : {}),
  })
}

export async function markFolioFeedbackSubmitted(folioToken: string): Promise<void> {
  await updateDoc(doc(db, 'publicFolios', folioToken), { feedbackSubmitted: true })
}

export function subscribeToSuggestions(
  propertyId: string,
  onData: (suggestions: GuestSuggestion[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const q = query(collection(db, 'guestSuggestions'), where('propertyId', '==', propertyId))
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as GuestSuggestion)
      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      onData(items)
    },
    (err) => onError(err),
  )
}

export async function markSuggestionRead(suggestionId: string): Promise<void> {
  await updateDoc(doc(db, 'guestSuggestions', suggestionId), { read: true })
}
