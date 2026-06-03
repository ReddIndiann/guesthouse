import type { RoomStatus } from '../../types'
import { roomStatusConfig } from '../../utils/roomStatus'

interface StatusLabelProps {
  status: RoomStatus
}

export function StatusLabel({ status }: StatusLabelProps) {
  const config = roomStatusConfig[status]
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${config.text}`}>
      <span className={`h-2 w-2 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  )
}
