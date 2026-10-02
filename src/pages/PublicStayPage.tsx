import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import type { PropertyItem } from '../types/tenant'
import type { PropertySettings, Room } from '../types'
import { DEFAULT_PROPERTY_SETTINGS } from '../types'
import { formatMoney } from '../utils/currency'

export function PublicStayPage() {
  const { identifier } = useParams<{ identifier: string }>()
  const [property, setProperty] = useState<PropertyItem | null>(null)
  const [settings, setSettings] = useState<PropertySettings>(DEFAULT_PROPERTY_SETTINGS)
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!identifier) {
      setError('Invalid property link')
      setLoading(false)
      return
    }

    async function loadData() {
      try {
        let propDoc = await getDoc(doc(db, 'properties', identifier!))
        let propData: PropertyItem | null = null

        if (propDoc.exists()) {
          propData = { id: propDoc.id, ...propDoc.data() } as PropertyItem
        } else {
          // Try lookup by code
          const q = query(collection(db, 'properties'), where('code', '==', identifier))
          const snap = await getDocs(q)
          if (!snap.empty) {
            propData = { id: snap.docs[0].id, ...snap.docs[0].data() } as PropertyItem
          }
        }

        if (!propData) {
          setError('Property not found')
          setLoading(false)
          return
        }

        setProperty(propData)
        if (propData.settings) {
          setSettings({
            ...DEFAULT_PROPERTY_SETTINGS,
            ...propData.settings,
          })
        }

        // Fetch rooms for this property
        const roomsSnap = await getDocs(collection(db, 'properties', propData.id, 'rooms'))
        const loadedRooms = roomsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Room))
        setRooms(loadedRooms)
      } catch (err) {
        console.error(err)
        setError('Failed to load guest house details')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [identifier])

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#FAF8F5]">
        <div className="text-center space-y-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-800 border-t-transparent mx-auto" />
          <p className="text-xs text-stone-500 font-medium tracking-wide">Loading property details…</p>
        </div>
      </div>
    )
  }

  if (error || !property) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[#FAF8F5] p-6 text-center">
        <h1 className="text-xl font-bold text-stone-900">Property Not Found</h1>
        <p className="mt-2 text-sm text-stone-500 max-w-sm">{error || 'The requested property could not be located.'}</p>
        <Link to="/" className="mt-6 rounded-lg bg-stone-900 px-4 py-2 text-xs font-semibold text-white">
          Go to Guestplace Home
        </Link>
      </div>
    )
  }

  const propName = property.name || settings.name || 'Guest House'
  const rates = settings.rates
  const availableCount = rooms.filter((r) => r.status === 'available').length

  const handleWhatsAppBooking = (roomTypeLabel?: string) => {
    let phone = (settings.phone || property.phone || '').replace(/[^0-9]/g, '')
    if (phone.startsWith('0')) {
      phone = '233' + phone.slice(1)
    }
    const msg = `Hello ${propName}! I would like to inquire about reserving a room${
      roomTypeLabel ? ` (${roomTypeLabel})` : ''
    }. Are you available today?`
    const url = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank')
  }

  return (
    <div className="min-h-dvh bg-[#FAF8F5] text-stone-900 selection:bg-amber-100 font-sans">
      {/* Top Banner */}
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 px-4 py-3.5 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-stone-900 flex items-center justify-center text-white font-bold text-sm">
              {propName.charAt(0)}
            </div>
            <div>
              <p className="font-bold text-sm text-stone-900 leading-tight">{propName}</p>
              {property.code && (
                <span className="font-mono text-[10px] text-stone-500 uppercase tracking-wider">{property.code}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(settings.phone || property.phone) && (
              <a
                href={`tel:${settings.phone || property.phone}`}
                className="hidden sm:inline-flex rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-50 transition"
              >
                📞 Call Front Desk
              </a>
            )}
            <button
              type="button"
              onClick={() => handleWhatsAppBooking()}
              className="rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800 transition flex items-center gap-1.5"
            >
              <span>💬</span>
              <span>Reserve via WhatsApp</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="mx-auto max-w-4xl px-4 py-8 space-y-8">
        <div className="relative overflow-hidden rounded-3xl border border-stone-200 bg-white p-6 sm:p-10 shadow-sm">
          {property.imageUrl && (
            <div className="mb-6 -mx-6 sm:-mx-10 -mt-6 sm:-mt-10 h-48 sm:h-64 overflow-hidden border-b border-stone-100">
              <img
                src={property.imageUrl}
                alt={propName}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-200">
                  ● {availableCount > 0 ? `${availableCount} Rooms Available Today` : 'Open for Reservations'}
                </span>
                {property.code && (
                  <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-mono text-stone-600">
                    Branch {property.code}
                  </span>
                )}
              </div>
              <h1 className="mt-3 text-2xl sm:text-4xl font-extrabold tracking-tight text-stone-900">
                {propName}
              </h1>
              {(property.address || settings.address) && (
                <p className="mt-2 text-sm text-stone-600 flex items-center gap-1.5">
                  <span>📍</span>
                  <span>{property.address || settings.address}</span>
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 sm:text-right shrink-0">
              <p className="text-xs text-stone-500 font-medium">Standard Overnight From</p>
              <p className="text-2xl font-black text-stone-900 mt-0.5">
                {formatMoney(rates.ac.fullDay)}
              </p>
              <p className="text-[11px] text-stone-500 mt-1">Short stays starting from {formatMoney(rates.nonAc.oneHour)}</p>
            </div>
          </div>

          {/* Quick Amenities */}
          <div className="mt-8 border-t border-stone-100 pt-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3">
              Property Amenities & Highlights
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="flex items-center gap-2 rounded-xl bg-stone-50 p-2.5 border border-stone-100 font-medium text-stone-800">
                <span className="text-base">⚡</span> 24/7 Power / Gen
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-stone-50 p-2.5 border border-stone-100 font-medium text-stone-800">
                <span className="text-base">❄️</span> Air Conditioning
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-stone-50 p-2.5 border border-stone-100 font-medium text-stone-800">
                <span className="text-base">📶</span> High-Speed Wi-Fi
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-stone-50 p-2.5 border border-stone-100 font-medium text-stone-800">
                <span className="text-base">🛡️</span> 24/7 Security
              </div>
            </div>
          </div>
        </div>

        {/* Room Types & Transparent Rates */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-stone-900">Room Types & Hourly Rates</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Instant short stays or full-day overnight reservations. Standard check-in {settings.checkInTime || '14:00'}.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {/* Standard AC */}
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-800 border border-blue-200">
                    Air Conditioned
                  </span>
                  <span className="text-xs text-stone-500">1-2 Guests</span>
                </div>
                <h3 className="text-base font-bold text-stone-900 mt-2">Deluxe AC Room</h3>
                <p className="text-xs text-stone-500 mt-1">Comfortable air-conditioned room with private bath, desk, and TV.</p>

                <div className="mt-4 space-y-1.5 border-t border-stone-100 pt-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-stone-50">
                    <span className="text-stone-500">1 Hour:</span>
                    <span className="font-semibold text-stone-900">{formatMoney(rates.ac.oneHour)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-50">
                    <span className="text-stone-500">2 Hours:</span>
                    <span className="font-semibold text-stone-900">{formatMoney(rates.ac.twoHours)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-50">
                    <span className="text-stone-500">3 Hours:</span>
                    <span className="font-semibold text-stone-900">{formatMoney(rates.ac.threeHours)}</span>
                  </div>
                  <div className="flex justify-between pt-1 text-sm font-bold text-emerald-800">
                    <span>Full Day / Night:</span>
                    <span>{formatMoney(rates.ac.fullDay)}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleWhatsAppBooking('Deluxe AC Room')}
                className="w-full rounded-xl bg-stone-900 py-2.5 text-xs font-semibold text-white hover:bg-stone-800 transition"
              >
                Inquire & Book
              </button>
            </div>

            {/* AC King / Suite */}
            <div className="rounded-2xl border-2 border-amber-300 bg-white p-5 shadow-sm flex flex-col justify-between space-y-4 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-950 shadow-sm">
                Most Popular
              </div>
              <div>
                <div className="flex items-center justify-between pt-1">
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800 border border-amber-200">
                    Suite / King Size
                  </span>
                  <span className="text-xs text-stone-500">King Bed</span>
                </div>
                <h3 className="text-base font-bold text-stone-900 mt-2">Executive AC Suite</h3>
                <p className="text-xs text-stone-500 mt-1">Spacious king-size luxury room with high-powered cooling and lounge area.</p>

                <div className="mt-4 space-y-1.5 border-t border-stone-100 pt-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-stone-50">
                    <span className="text-stone-500">1 Hour:</span>
                    <span className="font-semibold text-stone-900">{formatMoney(rates.acKing.oneHour)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-50">
                    <span className="text-stone-500">2 Hours:</span>
                    <span className="font-semibold text-stone-900">{formatMoney(rates.acKing.twoHours)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-50">
                    <span className="text-stone-500">3 Hours:</span>
                    <span className="font-semibold text-stone-900">{formatMoney(rates.acKing.threeHours)}</span>
                  </div>
                  <div className="flex justify-between pt-1 text-sm font-bold text-emerald-800">
                    <span>Full Day / Night:</span>
                    <span>{formatMoney(rates.acKing.fullDay)}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleWhatsAppBooking('Executive AC Suite')}
                className="w-full rounded-xl bg-amber-900 py-2.5 text-xs font-semibold text-white hover:bg-amber-950 transition"
              >
                Inquire & Book
              </button>
            </div>

            {/* Non-AC Standard */}
            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-stone-700">
                    Fan Cooled
                  </span>
                  <span className="text-xs text-stone-500">Budget Friendly</span>
                </div>
                <h3 className="text-base font-bold text-stone-900 mt-2">Standard Non-AC</h3>
                <p className="text-xs text-stone-500 mt-1">Clean, airy room equipped with ceiling fan, private bathroom, and fresh linens.</p>

                <div className="mt-4 space-y-1.5 border-t border-stone-100 pt-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-stone-50">
                    <span className="text-stone-500">1 Hour:</span>
                    <span className="font-semibold text-stone-900">{formatMoney(rates.nonAc.oneHour)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-50">
                    <span className="text-stone-500">2 Hours:</span>
                    <span className="font-semibold text-stone-900">{formatMoney(rates.nonAc.twoHours)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-50">
                    <span className="text-stone-500">3 Hours:</span>
                    <span className="font-semibold text-stone-900">{formatMoney(rates.nonAc.threeHours)}</span>
                  </div>
                  <div className="flex justify-between pt-1 text-sm font-bold text-emerald-800">
                    <span>Full Day / Night:</span>
                    <span>{formatMoney(rates.nonAc.fullDay)}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleWhatsAppBooking('Standard Non-AC Room')}
                className="w-full rounded-xl bg-stone-900 py-2.5 text-xs font-semibold text-white hover:bg-stone-800 transition"
              >
                Inquire & Book
              </button>
            </div>
          </div>
        </section>

        {/* Location & Contact Information */}
        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-stone-900 mb-4">Location & Front Desk Contact</h2>
          <div className="grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <p className="text-xs text-stone-500 font-semibold uppercase">Address</p>
              <p className="font-medium text-stone-800 mt-0.5">{property.address || settings.address || 'Contact front desk for directions'}</p>

              {(property.latitude && property.longitude) ? (
                <a
                  href={`https://www.google.com/maps?q=${property.latitude},${property.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                >
                  <span>🗺️</span> Open in Google Maps
                </a>
              ) : null}
            </div>

            <div>
              <p className="text-xs text-stone-500 font-semibold uppercase">Front Desk Phone / WhatsApp</p>
              <p className="font-medium text-stone-800 mt-0.5">{settings.phone || property.phone || 'Available upon request'}</p>
              <p className="text-xs text-stone-500 mt-1">Check-in: {settings.checkInTime || '14:00'} · Check-out: {settings.checkOutTime || '11:00'}</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="mt-12 border-t border-stone-200 bg-white py-6 text-center text-xs text-stone-500">
        <p>© {new Date().getFullYear()} {propName}. Powered by Guestplace Hospitality.</p>
      </footer>
    </div>
  )
}
