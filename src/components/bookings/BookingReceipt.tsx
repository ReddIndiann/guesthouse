import type { Booking, Guest, PropertySettings, Room } from '../../types'
import { formatMoney } from '../../utils/currency'
import { formatBookingSchedule } from '../../utils/datetime'
import { formatBookingRateLabel } from '../../utils/pricing'

interface BookingReceiptProps {
  settings: PropertySettings
  booking: Booking
  guest: Guest | undefined
  room: Room | undefined
}

export function formatPaymentMethodLabel(method?: string, provider?: string): string {
  if (!method) return 'Cash'
  if (method === 'momo') {
    const prov = provider ? provider.toUpperCase() + ' ' : ''
    return `${prov}Mobile Money`
  }
  if (method === 'card') return 'Debit / Credit Card'
  if (method === 'bank_transfer') return 'Bank Transfer'
  return method.toUpperCase()
}

export function BookingReceipt({ settings, booking, guest, room }: BookingReceiptProps) {
  const balance = Math.max(0, booking.totalAmount - booking.amountPaid)
  const roomBase = booking.baseAmount ?? (booking.totalAmount - (booking.extraCharges ?? []).reduce((s, c) => s + c.amount, 0))

  return (
    <div className="receipt-root mx-auto max-w-sm bg-white p-5 font-mono text-[var(--color-ink)] border border-[var(--color-line)] rounded-xl sm:rounded-2xl shadow-sm print:border-none print:shadow-none print:max-w-none print:p-0">
      <div className="border-b border-dashed border-[var(--color-line)] pb-4 text-center">
        <h1 className="text-lg font-bold tracking-tight uppercase">{settings.name || 'Guestplace'}</h1>
        {settings.address && <p className="mt-1 text-xs text-[var(--color-muted)]">{settings.address}</p>}
        {settings.phone && <p className="text-xs text-[var(--color-muted)]">Tel: {settings.phone}</p>}
        <p className="mt-2 text-[11px] text-[var(--color-muted)]">
          {new Date().toLocaleString('en-GH', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
      </div>

      <dl className="mt-4 space-y-2 text-xs">
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--color-muted)]">Guest:</dt>
          <dd className="font-semibold text-right">{guest?.name ?? '—'}</dd>
        </div>
        {guest?.phone && (
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--color-muted)]">Phone:</dt>
            <dd className="text-right">{guest.phone}</dd>
          </div>
        )}
        {guest?.idNumber && (
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--color-muted)]">ID / Ghana Card:</dt>
            <dd className="text-right">{guest.idNumber}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--color-muted)]">Room:</dt>
          <dd className="font-bold text-right text-sm">Room {room?.number ?? '—'}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--color-muted)]">Plan:</dt>
          <dd className="text-right">{formatBookingRateLabel(booking.rateType, booking.hours)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-[var(--color-muted)]">Schedule:</dt>
          <dd className="text-right text-[11px]">{formatBookingSchedule(booking)}</dd>
        </div>
      </dl>

      {/* Itemized charges */}
      <div className="mt-4 border-t border-dashed border-[var(--color-line)] pt-3 space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span>Room Rate</span>
          <span>{formatMoney(roomBase)}</span>
        </div>
        {(booking.extraCharges ?? []).map((charge) => (
          <div key={charge.id} className="flex justify-between text-[var(--color-muted)]">
            <span>+ {charge.description}</span>
            <span>{formatMoney(charge.amount)}</span>
          </div>
        ))}
      </div>

      {/* Payment details */}
      <div className="mt-3 border-t border-dashed border-[var(--color-line)] pt-3 space-y-1 text-xs">
        <div className="flex justify-between font-bold text-sm">
          <span>TOTAL</span>
          <span>{formatMoney(booking.totalAmount)}</span>
        </div>
        <div className="flex justify-between text-emerald-800">
          <span>PAID</span>
          <span className="font-semibold">{formatMoney(booking.amountPaid)}</span>
        </div>
        {balance > 0 ? (
          <div className="flex justify-between font-bold text-rose-700">
            <span>BALANCE DUE</span>
            <span>{formatMoney(balance)}</span>
          </div>
        ) : (
          <div className="flex justify-between text-[11px] text-emerald-700 font-medium">
            <span>STATUS</span>
            <span>SETTLED IN FULL</span>
          </div>
        )}

        <div className="mt-2 pt-2 border-t border-dotted border-[var(--color-line)] flex justify-between text-[11px] text-[var(--color-muted)]">
          <span>Method:</span>
          <span className="font-medium text-[var(--color-ink)]">
            {formatPaymentMethodLabel(booking.paymentMethod, booking.momoProvider)}
          </span>
        </div>
        {booking.paymentReference && (
          <div className="flex justify-between text-[11px] text-[var(--color-muted)]">
            <span>Txn Ref:</span>
            <span className="font-mono text-[var(--color-ink)]">{booking.paymentReference}</span>
          </div>
        )}
      </div>

      {settings.wifiPassword && (
        <div className="mt-4 rounded-lg bg-[var(--color-cream)] p-2.5 text-center text-xs border border-[var(--color-line)]">
          <p className="text-[10px] uppercase tracking-wider text-[var(--color-muted)]">Wi-Fi Access</p>
          <p className="font-mono font-bold mt-0.5 text-sm">{settings.wifiPassword}</p>
        </div>
      )}

      <div className="mt-5 border-t border-dashed border-[var(--color-line)] pt-3 text-center text-[11px] text-[var(--color-muted)]">
        <p>Thank you for choosing {settings.name || 'us'}!</p>
        <p className="mt-0.5 text-[10px]">Please retain this receipt</p>
      </div>
    </div>
  )
}

export function printBookingReceipt() {
  window.print()
}
