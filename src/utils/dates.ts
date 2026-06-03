export function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn + 'T12:00:00')
  const end = new Date(checkOut + 'T12:00:00')
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
}

export function isToday(dateStr: string): boolean {
  const today = new Date().toISOString().split('T')[0]
  return dateStr === today
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

export function addDaysISO(dateStr: string, days: number): string {
  const date = new Date(dateStr + 'T12:00:00')
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

export function getWeekDates(startDate: string, days = 7): string[] {
  return Array.from({ length: days }, (_, i) => addDaysISO(startDate, i))
}

export function formatWeekday(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })
}

export function formatShortDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function isDateInRange(dateStr: string, checkIn: string, checkOut: string): boolean {
  return dateStr >= checkIn && dateStr < checkOut
}
