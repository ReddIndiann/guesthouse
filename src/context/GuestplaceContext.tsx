import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from './AuthContext'
import { logActivity } from '../lib/operations'
import {
  cancelBookingRecord,
  checkInBooking,
  checkOutBooking,
  clearPropertyData,
  createBookingRecord,
  createCommunicationRecord,
  createMessageTemplateRecord,
  createRoomRecord,
  deleteMessageTemplateRecord,
  ensureDefaultMessageTemplates,
  deleteRoomRecord,
  markRoomReady,
  subscribeToBookings,
  subscribeToCommunications,
  subscribeToMessageTemplates,
  subscribeToGuests,
  subscribeToPropertySettings,
  subscribeToRooms,
  updateBookingPayment,
  updateMessageTemplateRecord,
  updatePropertySettings,
  updateRoomRecord,
  updateRoomStatus as updateRoomStatusDb,
} from '../lib/firestore'
import { preparePostCheckoutFeedback } from '../lib/checkoutFeedback'
import { markSuggestionRead, subscribeToSuggestions } from '../lib/suggestions'
import {
  DEFAULT_PROPERTY_SETTINGS,
  type Booking,
  type Communication,
  type Guest,
  type GuestSuggestion,
  type MessageTemplate,
  type MessageTemplateInput,
  type NewBookingInput,
  type NewCommunicationInput,
  type PropertySettings,
  type Room,
  type RoomInput,
  type RoomStatus,
} from '../types'

interface GuestplaceContextValue {
  rooms: Room[]
  guests: Guest[]
  bookings: Booking[]
  communications: Communication[]
  messageTemplates: MessageTemplate[]
  suggestions: GuestSuggestion[]
  settings: PropertySettings
  loading: boolean
  error: string | null
  getGuest: (id: string) => Guest | undefined
  getRoom: (id: string) => Room | undefined
  getBookingForRoom: (roomId: string) => Booking | undefined
  getGuestBookings: (guestId: string) => Booking[]
  updateRoomStatus: (roomId: string, status: RoomStatus) => Promise<void>
  markRoomReady: (roomId: string) => Promise<void>
  addRoom: (input: RoomInput) => Promise<void>
  updateRoom: (roomId: string, input: RoomInput) => Promise<void>
  deleteRoom: (roomId: string) => Promise<void>
  checkIn: (bookingId: string) => Promise<void>
  checkOut: (bookingId: string) => Promise<void>
  createBooking: (input: NewBookingInput) => Promise<string>
  cancelBooking: (bookingId: string) => Promise<void>
  updatePayment: (bookingId: string, amountPaid: number) => Promise<void>
  updateSettings: (settings: PropertySettings) => Promise<void>
  sendCommunication: (input: NewCommunicationInput) => Promise<void>
  addMessageTemplate: (input: MessageTemplateInput) => Promise<void>
  updateMessageTemplate: (id: string, input: MessageTemplateInput) => Promise<void>
  deleteMessageTemplate: (id: string) => Promise<void>
  markSuggestionAsRead: (id: string) => Promise<void>
  checkoutFeedback: { booking: Booking; guest: Guest; room: Room } | null
  clearCheckoutFeedback: () => void
  clearPropertyData: () => Promise<void>
}

const GuestplaceContext = createContext<GuestplaceContextValue | null>(null)

export function GuestplaceProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth()
  const [rooms, setRooms] = useState<Room[]>([])
  const [guests, setGuests] = useState<Guest[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [communications, setCommunications] = useState<Communication[]>([])
  const [messageTemplates, setMessageTemplates] = useState<MessageTemplate[]>([])
  const [suggestions, setSuggestions] = useState<GuestSuggestion[]>([])
  const [checkoutFeedback, setCheckoutFeedback] = useState<{
    booking: Booking
    guest: Guest
    room: Room
  } | null>(null)
  const [settings, setSettings] = useState<PropertySettings>(DEFAULT_PROPERTY_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const propertyId = profile?.propertyId

  useEffect(() => {
    if (!propertyId) {
      setRooms([])
      setGuests([])
      setBookings([])
      setCommunications([])
      setMessageTemplates([])
      setSuggestions([])
      setLoading(!profile)
      return
    }

    let ready = false
    setLoading(true)
    setError(null)

    const markReady = () => {
      if (!ready) {
        ready = true
        setLoading(false)
      }
    }

    const handleError = (err: Error) => {
      setError(err.message)
      markReady()
    }

    const unsubRooms = subscribeToRooms(propertyId, (data) => {
      setRooms(data)
      markReady()
    }, handleError)
    const unsubGuests = subscribeToGuests(propertyId, setGuests, handleError)
    const unsubBookings = subscribeToBookings(propertyId, setBookings, handleError)
    const unsubCommunications = subscribeToCommunications(propertyId, setCommunications, handleError)
    const unsubTemplates = subscribeToMessageTemplates(propertyId, setMessageTemplates, handleError)
    const unsubSuggestions = subscribeToSuggestions(propertyId, setSuggestions, handleError)
    const unsubSettings = subscribeToPropertySettings(propertyId, setSettings, handleError)

    return () => {
      unsubRooms()
      unsubGuests()
      unsubBookings()
      unsubCommunications()
      unsubTemplates()
      unsubSuggestions()
      unsubSettings()
    }
  }, [propertyId, profile])

  useEffect(() => {
    if (!propertyId) return
    ensureDefaultMessageTemplates(propertyId).catch(console.error)
  }, [propertyId])

  const getGuest = useCallback((id: string) => guests.find((g) => g.id === id), [guests])
  const getRoom = useCallback((id: string) => rooms.find((r) => r.id === id), [rooms])

  const getBookingForRoom = useCallback(
    (roomId: string) =>
      bookings.find(
        (b) =>
          b.roomId === roomId &&
          (b.status === 'checked_in' || b.status === 'confirmed'),
      ),
    [bookings],
  )

  const getGuestBookings = useCallback(
    (guestId: string) =>
      [...bookings]
        .filter((b) => b.guestId === guestId)
        .sort((a, b) => new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime()),
    [bookings],
  )

  const updateRoomStatus = useCallback(
    async (roomId: string, status: RoomStatus) => {
      if (!propertyId) return
      await updateRoomStatusDb(propertyId, roomId, status)
    },
    [propertyId],
  )

  const markRoomReadyFn = useCallback(
    async (roomId: string) => {
      if (!propertyId) return
      await markRoomReady(propertyId, roomId)
    },
    [propertyId],
  )

  const addRoom = useCallback(
    async (input: RoomInput) => {
      if (!propertyId) return
      const duplicate = rooms.some(
        (r) => r.number.toLowerCase() === input.number.trim().toLowerCase(),
      )
      if (duplicate) throw new Error(`Room ${input.number} already exists`)
      await createRoomRecord(propertyId, input)
    },
    [propertyId, rooms],
  )

  const updateRoom = useCallback(
    async (roomId: string, input: RoomInput) => {
      if (!propertyId) return
      const duplicate = rooms.some(
        (r) =>
          r.id !== roomId &&
          r.number.toLowerCase() === input.number.trim().toLowerCase(),
      )
      if (duplicate) throw new Error(`Room ${input.number} already exists`)
      await updateRoomRecord(propertyId, roomId, input)
    },
    [propertyId, rooms],
  )

  const deleteRoom = useCallback(
    async (roomId: string) => {
      if (!propertyId) return
      const active = bookings.some(
        (b) =>
          b.roomId === roomId &&
          (b.status === 'checked_in' || b.status === 'confirmed'),
      )
      if (active) {
        throw new Error('Cannot delete a room with an active or upcoming booking')
      }
      await deleteRoomRecord(propertyId, roomId)
    },
    [propertyId, bookings],
  )

  const checkIn = useCallback(
    async (bookingId: string) => {
      if (!propertyId) return
      const booking = bookings.find((b) => b.id === bookingId)
      const room = booking ? rooms.find((r) => r.id === booking.roomId) : undefined
      if (!booking) return
      await checkInBooking(propertyId, bookingId, booking.roomId)
      await logActivity(propertyId, {
        action: 'check_in',
        entityType: 'booking',
        entityId: bookingId,
        details: room ? `Room ${room.number}` : undefined,
        performedBy: user?.uid ?? '',
        performedByName: profile?.displayName ?? 'Staff',
      })
    },
    [propertyId, bookings, rooms, user, profile],
  )

  const checkOut = useCallback(
    async (bookingId: string) => {
      if (!propertyId) return
      const booking = bookings.find((b) => b.id === bookingId)
      const room = booking ? rooms.find((r) => r.id === booking.roomId) : undefined
      const guest = booking ? guests.find((g) => g.id === booking.guestId) : undefined
      if (!booking || !room || !guest) return
      await checkOutBooking(propertyId, bookingId, booking.roomId)
      await preparePostCheckoutFeedback(propertyId, booking, guest, room, settings).catch(
        console.error,
      )
      setCheckoutFeedback({ booking, guest, room })
      await logActivity(propertyId, {
        action: 'check_out',
        entityType: 'booking',
        entityId: bookingId,
        details: `Room ${room.number}`,
        performedBy: user?.uid ?? '',
        performedByName: profile?.displayName ?? 'Staff',
      })
    },
    [propertyId, bookings, rooms, guests, settings, user, profile],
  )

  const clearCheckoutFeedback = useCallback(() => setCheckoutFeedback(null), [])

  const createBooking = useCallback(
    async (input: NewBookingInput) => {
      if (!propertyId) throw new Error('Not signed in')
      const room = rooms.find((r) => r.id === input.roomId)
      if (!room) throw new Error('Room not found')
      if (room.status !== 'available') throw new Error('Room is not available')
      
      const existingGuest = guests.find((g) => {
        const nameMatch = g.name.trim().toLowerCase() === input.guest.name.trim().toLowerCase()
        if (!nameMatch) return false
        if (input.guest.phone && g.phone) {
          return g.phone.trim() === input.guest.phone.trim()
        }
        return true
      })
      
      return createBookingRecord(propertyId, input, room, bookings, settings, existingGuest?.id)
    },
    [propertyId, rooms, bookings, settings, guests],
  )

  const cancelBooking = useCallback(
    async (bookingId: string) => {
      if (!propertyId) return
      const booking = bookings.find((b) => b.id === bookingId)
      if (!booking) return
      const room = rooms.find((r) => r.id === booking.roomId)
      await cancelBookingRecord(
        propertyId,
        bookingId,
        booking.roomId,
        room?.status ?? 'available',
      )
    },
    [propertyId, bookings, rooms],
  )

  const updatePayment = useCallback(
    async (bookingId: string, amountPaid: number) => {
      if (!propertyId) return
      const booking = bookings.find((b) => b.id === bookingId)
      if (!booking) return
      await updateBookingPayment(propertyId, bookingId, amountPaid, booking.totalAmount)
    },
    [propertyId, bookings],
  )

  const updateSettings = useCallback(
    async (next: PropertySettings) => {
      if (!propertyId) return
      await updatePropertySettings(propertyId, next)
    },
    [propertyId],
  )

  const sendCommunication = useCallback(
    async (input: NewCommunicationInput) => {
      if (!propertyId) throw new Error('Not signed in')
      await createCommunicationRecord(propertyId, input)
    },
    [propertyId],
  )

  const addMessageTemplate = useCallback(
    async (input: MessageTemplateInput) => {
      if (!propertyId) throw new Error('Not signed in')
      await createMessageTemplateRecord(propertyId, input)
    },
    [propertyId],
  )

  const updateMessageTemplate = useCallback(
    async (id: string, input: MessageTemplateInput) => {
      if (!propertyId) throw new Error('Not signed in')
      await updateMessageTemplateRecord(propertyId, id, input)
    },
    [propertyId],
  )

  const deleteMessageTemplate = useCallback(
    async (id: string) => {
      if (!propertyId) throw new Error('Not signed in')
      await deleteMessageTemplateRecord(propertyId, id)
    },
    [propertyId],
  )

  const markSuggestionAsRead = useCallback(async (id: string) => {
    await markSuggestionRead(id)
  }, [])

  const clearAllPropertyData = useCallback(async () => {
    if (!propertyId) return
    await clearPropertyData(propertyId)
  }, [propertyId])

  const value = useMemo(
    () => ({
      rooms,
      guests,
      bookings,
      communications,
      messageTemplates,
      suggestions,
      settings,
      loading,
      error,
      getGuest,
      getRoom,
      getBookingForRoom,
      getGuestBookings,
      updateRoomStatus,
      markRoomReady: markRoomReadyFn,
      addRoom,
      updateRoom,
      deleteRoom,
      checkIn,
      checkOut,
      createBooking,
      cancelBooking,
      updatePayment,
      updateSettings,
      sendCommunication,
      addMessageTemplate,
      updateMessageTemplate,
      deleteMessageTemplate,
      markSuggestionAsRead,
      checkoutFeedback,
      clearCheckoutFeedback,
      clearPropertyData: clearAllPropertyData,
    }),
    [
      rooms,
      guests,
      bookings,
      communications,
      messageTemplates,
      suggestions,
      settings,
      loading,
      error,
      getGuest,
      getRoom,
      getBookingForRoom,
      getGuestBookings,
      updateRoomStatus,
      markRoomReadyFn,
      addRoom,
      updateRoom,
      deleteRoom,
      checkIn,
      checkOut,
      createBooking,
      cancelBooking,
      updatePayment,
      updateSettings,
      sendCommunication,
      addMessageTemplate,
      updateMessageTemplate,
      deleteMessageTemplate,
      markSuggestionAsRead,
      checkoutFeedback,
      clearCheckoutFeedback,
      clearAllPropertyData,
    ],
  )

  return <GuestplaceContext.Provider value={value}>{children}</GuestplaceContext.Provider>
}

export function useGuestplace() {
  const ctx = useContext(GuestplaceContext)
  if (!ctx) throw new Error('useGuestplace must be used within GuestplaceProvider')
  return ctx
}
