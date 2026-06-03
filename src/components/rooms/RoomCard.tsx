import type { Room } from '../../types'
import { formatMoneyPerNight } from '../../utils/currency'
import { StatusLabel } from '../ui/StatusLabel'

interface RoomCardProps {
  room: Room
  guestName?: string
  onClick: () => void
}

export function RoomCard({ room, guestName, onClick }: RoomCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full min-h-[120px] rounded-2xl bg-white p-4 text-left shadow-[0_1px_2px_rgba(26,24,20,0.04)] transition-all active:scale-[0.98] sm:min-h-0 sm:p-5 sm:hover:shadow-[0_4px_12px_rgba(26,24,20,0.06)]"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-2xl font-semibold tracking-tight text-[var(--color-ink)] sm:text-3xl">
          {room.number}
        </span>
        <StatusLabel status={room.status} />
      </div>
      <p className="mt-2 text-xs capitalize text-[var(--color-muted)] sm:mt-3 sm:text-sm">
        {room.type} · Floor {room.floor}
      </p>
      <p className="mt-3 text-sm font-medium text-[var(--color-ink)] sm:mt-4">
        {formatMoneyPerNight(room.pricePerNight)}
      </p>
      {guestName && (
        <p className="mt-1.5 truncate text-xs text-[var(--color-muted)]">{guestName}</p>
      )}
    </button>
  )
}
