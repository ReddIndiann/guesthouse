import { useMemo, useState } from 'react'
import { NewBookingDialog } from '../components/bookings/NewBookingDialog'
import { RoomCard } from '../components/rooms/RoomCard'
import { RoomDetailDialog } from '../components/rooms/RoomDetailDialog'
import { RoomFormDialog } from '../components/rooms/RoomFormDialog'
import { PageHeader } from '../components/ui/PageHeader'
import { Panel } from '../components/ui/Panel'
import { useRbac } from '../context/RbacContext'
import { useGuestplace } from '../context/GuestplaceContext'
import type { Room, RoomInput, RoomStatus } from '../types'

const filters: { value: RoomStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'available', label: 'Free' },
  { value: 'occupied', label: 'Busy' },
  { value: 'reserved', label: 'Booked' },
  { value: 'cleaning', label: 'Cleaning' },
]

const DEMO_ROOM_NUMBERS = ['101', '102', '103', '201', '202', '203', '301', '302']

function hasDemoRooms(rooms: Room[]) {
  if (rooms.length !== DEMO_ROOM_NUMBERS.length) return false
  const numbers = new Set(rooms.map((r) => r.number))
  return DEMO_ROOM_NUMBERS.every((n) => numbers.has(n))
}

export function RoomsPage() {
  const { can } = useRbac()
  const { rooms, bookings, getGuest, addRoom, clearPropertyData } = useGuestplace()
  const [statusFilter, setStatusFilter] = useState<RoomStatus | 'all'>('all')
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [bookingRoomId, setBookingRoomId] = useState<string | undefined>()
  const [clearing, setClearing] = useState(false)

  const filteredRooms = useMemo(
    () => (statusFilter === 'all' ? rooms : rooms.filter((r) => r.status === statusFilter)),
    [rooms, statusFilter],
  )

  const floors = useMemo(
    () => [...new Set(rooms.map((r) => r.floor))].sort((a, b) => a - b),
    [rooms],
  )

  const roomNumbers = useMemo(() => rooms.map((r) => r.number), [rooms])

  const getGuestForRoom = (roomId: string) => {
    const booking = bookings.find((b) => b.roomId === roomId && b.status === 'checked_in')
    return booking ? getGuest(booking.guestId)?.name : undefined
  }

  const handleAddRoom = async (input: RoomInput) => {
    await addRoom(input)
  }

  const handleClearDemoData = async () => {
    if (
      !window.confirm(
        'Remove all demo rooms, guests, and bookings? This cannot be undone.',
      )
    ) {
      return
    }
    setClearing(true)
    try {
      await clearPropertyData()
    } finally {
      setClearing(false)
    }
  }

  const showDemoBanner = hasDemoRooms(rooms) && can('rooms.delete')

  return (
    <div>
      <PageHeader
        title="Rooms"
        subtitle="Tap a room for details"
        action={
          can('rooms.create') ? (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white"
            >
              + Add room
            </button>
          ) : undefined
        }
      />

      {showDemoBanner && (
        <Panel className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium text-[var(--color-ink)]">Demo data detected</p>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              These rooms were loaded from the old sample setup. Clear them to start with an empty
              list and add your own rooms.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClearDemoData}
            disabled={clearing}
            className="shrink-0 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 disabled:opacity-50"
          >
            {clearing ? 'Removing…' : 'Remove demo data'}
          </button>
        </Panel>
      )}

      {rooms.length > 0 && (
        <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            {filters.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatusFilter(f.value)}
                className={`shrink-0 rounded-full px-3.5 py-2 text-sm transition-colors active:scale-95 sm:py-1.5 ${
                  statusFilter === f.value
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-white text-[var(--color-muted)]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {can('rooms.create') && (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="shrink-0 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white sm:ml-2"
            >
              + Add room
            </button>
          )}
        </div>
      )}

      {rooms.length === 0 ? (
        <Panel className="py-12 text-center sm:py-16">
          <p className="text-lg font-medium text-[var(--color-ink)]">No rooms yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--color-muted)]">
            Add your guest house rooms here — number, floor, type, and nightly rate. You can edit
            or remove them anytime.
          </p>
          {can('rooms.create') ? (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="mt-6 rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white"
            >
              Add your first room
            </button>
          ) : (
            <p className="mt-6 text-sm text-[var(--color-muted)]">
              Ask an administrator to add rooms for this property.
            </p>
          )}
        </Panel>
      ) : (
        floors.map((floor) => {
          const floorRooms = filteredRooms.filter((r) => r.floor === floor)
          if (floorRooms.length === 0) return null

          return (
            <section key={floor} className="mb-8 sm:mb-10">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)] sm:mb-4">
                Floor {floor}
              </p>
              <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:gap-4">
                {floorRooms.map((room) => (
                  <RoomCard
                    key={room.id}
                    room={room}
                    guestName={getGuestForRoom(room.id)}
                    onClick={() => setSelectedRoom(room)}
                  />
                ))}
              </div>
            </section>
          )
        })
      )}

      <RoomDetailDialog
        room={selectedRoom}
        guestName={selectedRoom ? getGuestForRoom(selectedRoom.id) : undefined}
        open={!!selectedRoom}
        onClose={() => setSelectedRoom(null)}
        onDeleted={() => setSelectedRoom(null)}
        onBook={(roomId) => {
          setBookingRoomId(roomId)
          setBookingOpen(true)
        }}
      />

      <RoomFormDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAddRoom}
        existingNumbers={roomNumbers}
      />

      <NewBookingDialog
        open={bookingOpen}
        onClose={() => {
          setBookingOpen(false)
          setBookingRoomId(undefined)
        }}
        preselectedRoomId={bookingRoomId}
      />
    </div>
  )
}
