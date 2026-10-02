import { useState, useRef, type FormEvent, type ChangeEvent } from 'react'
import { createOrganizationDirectly } from '../../lib/tenants'
import type { OrganizationPlan } from '../../types/tenant'
import { compressImageFile } from '../../utils/image'
import { PRESET_COLOR_THEMES } from '../../utils/theme'

interface CreateOrgModalProps {
  open: boolean
  onClose: () => void
  adminUid: string
  onCreated?: (orgId: string) => void
}

export function CreateOrgModal({ open, onClose, adminUid, onCreated }: CreateOrgModalProps) {
  const [name, setName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [ownerEmail, setOwnerEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [plan, setPlan] = useState<OrganizationPlan>('starter')
  const [initialPropertyName, setInitialPropertyName] = useState('')
  const [notes, setNotes] = useState('')
  const [colorThemeId, setColorThemeId] = useState('sage')
  const [accentColor, setAccentColor] = useState('#3d6b4f')

  // Visual and geographic fields
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload')
  const [imageUrl, setImageUrl] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [location, setLocation] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [locatingGps, setLocatingGps] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  if (!open) return null

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setUploadingImage(true)
    try {
      const compressed = await compressImageFile(file, 1000, 1000, 0.8)
      setImageUrl(compressed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process image file')
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }
    setLocatingGps(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6))
        setLongitude(pos.coords.longitude.toFixed(6))
        setLocatingGps(false)
      },
      (err) => {
        setLocatingGps(false)
        setError(err.message || 'Unable to retrieve your current GPS coordinates')
      },
      { timeout: 10000, enableHighAccuracy: true },
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !ownerEmail.trim()) return
    setError(null)
    setSubmitting(true)

    const parsedLat = latitude.trim() !== '' ? parseFloat(latitude.trim()) : undefined
    const parsedLng = longitude.trim() !== '' ? parseFloat(longitude.trim()) : undefined

    try {
      const orgId = await createOrganizationDirectly(
        {
          name: name.trim(),
          ownerName: ownerName.trim() || 'Admin',
          ownerEmail: ownerEmail.trim(),
          phone: phone.trim() || undefined,
          plan,
          initialPropertyName: initialPropertyName.trim() || undefined,
          notes: notes.trim() || undefined,
          imageUrl: imageUrl.trim() || undefined,
          location: location.trim() || undefined,
          latitude: typeof parsedLat === 'number' && !isNaN(parsedLat) ? parsedLat : undefined,
          longitude: typeof parsedLng === 'number' && !isNaN(parsedLng) ? parsedLng : undefined,
          accentColor,
          colorThemeId,
        },
        adminUid,
      )

      onCreated?.(orgId)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to provision organization')
    } finally {
      setSubmitting(false)
    }
  }

  const hasCoordinates =
    latitude.trim() !== '' &&
    longitude.trim() !== '' &&
    !isNaN(parseFloat(latitude)) &&
    !isNaN(parseFloat(longitude))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl border border-[var(--color-line)] max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--color-line)] shrink-0">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-ink)]">New organization</h2>
            <p className="text-xs text-[var(--color-muted)] mt-0.5">
              Directly configure and activate a new organization account
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--color-muted)] hover:bg-[var(--color-cream)] hover:text-[var(--color-ink)] transition"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200 shrink-0">
            {error}
          </div>
        )}

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1">
          {/* Organization Name */}
          <div>
            <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">
              Organization name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Palm Grove Resorts"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] focus:bg-white transition"
            />
          </div>

          {/* Photo / Logo Selection */}
          <div className="rounded-xl border border-[var(--color-line)] p-3.5 bg-[var(--color-cream)]/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-medium text-[var(--color-ink)]">
                Organization photo or logo
              </label>
              <div className="inline-flex rounded-lg border border-[var(--color-line)] bg-white p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setImageMode('upload')}
                  className={`rounded-md px-2.5 py-1 font-medium transition ${
                    imageMode === 'upload'
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
                  }`}
                >
                  Upload file
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode('url')}
                  className={`rounded-md px-2.5 py-1 font-medium transition ${
                    imageMode === 'url'
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
                  }`}
                >
                  Link URL
                </button>
              </div>
            </div>

            {/* Upload Mode */}
            {imageMode === 'upload' ? (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="org-image-file"
                />
                <label
                  htmlFor="org-image-file"
                  className="flex items-center justify-center gap-2 w-full rounded-lg border border-dashed border-[var(--color-line)] bg-white px-4 py-3 text-xs text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-ink)] transition cursor-pointer"
                >
                  <svg
                    className="w-4 h-4 text-[var(--color-muted)]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span>
                    {uploadingImage
                      ? 'Compressing image…'
                      : 'Click to select an image from your computer'}
                  </span>
                </label>
              </div>
            ) : (
              /* Link Mode */
              <div>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-xs text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] transition"
                />
              </div>
            )}

            {/* Image Preview */}
            {imageUrl && (
              <div className="flex items-center gap-3 pt-1">
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="h-12 w-12 rounded-lg object-cover border border-[var(--color-line)] shadow-2xs"
                  onError={() => setError('Image link could not be loaded. Please verify the URL.')}
                />
                <div className="flex-1 min-w-0 text-xs">
                  <p className="font-medium text-[var(--color-ink)] truncate">Photo attached</p>
                  <p className="text-[11px] text-[var(--color-muted)]">Ready to save</p>
                </div>
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="rounded-lg border border-[var(--color-line)] bg-white px-2 py-1 text-[11px] text-[var(--color-muted)] hover:text-rose-600 transition"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          {/* Location & GPS Coordinates */}
          <div className="rounded-xl border border-[var(--color-line)] p-3.5 bg-[var(--color-cream)]/50 space-y-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-ink)] mb-1">
                Location & address
              </label>
              <input
                type="text"
                placeholder="e.g. 14 Marina Road, Airport Residential, Accra"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] transition"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-[var(--color-muted)]">
                  Geographic coordinates (latitude & longitude)
                </label>
                <button
                  type="button"
                  onClick={handleDetectLocation}
                  disabled={locatingGps}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--color-accent)] hover:underline disabled:opacity-50 cursor-pointer"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path strokeLinecap="round" d="M12 3v3m0 12v3M3 12h3m12 0h3" />
                  </svg>
                  {locatingGps ? 'Detecting GPS…' : 'Use my GPS'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <input
                    type="number"
                    step="any"
                    placeholder="Latitude (e.g. 5.6037)"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-xs text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] transition"
                  />
                </div>
                <div>
                  <input
                    type="number"
                    step="any"
                    placeholder="Longitude (e.g. -0.1870)"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-xs text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] transition"
                  />
                </div>
              </div>

              {hasCoordinates && (
                <div className="mt-1.5 flex items-center justify-between text-[11px]">
                  <span className="text-[var(--color-muted)]">
                    Coordinates set: {latitude}, {longitude}
                  </span>
                  <a
                    href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--color-accent)] hover:underline inline-flex items-center gap-0.5"
                  >
                    Preview on Google Maps ↗
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Owner details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">
                Owner name
              </label>
              <input
                type="text"
                placeholder="e.g. Sarah Jenkins"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">
                Owner email *
              </label>
              <input
                type="email"
                required
                placeholder="admin@palmgrove.com"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] focus:bg-white transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">
                Phone
              </label>
              <input
                type="text"
                placeholder="+1 555-0100"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">
                Subscription plan
              </label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value as OrganizationPlan)}
                className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] focus:bg-white transition"
              >
                <option value="starter">Starter</option>
                <option value="growth">Growth</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">
              Initial branch name
            </label>
            <input
              type="text"
              placeholder="e.g. Palm Grove Main Resort"
              value={initialPropertyName}
              onChange={(e) => setInitialPropertyName(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] focus:bg-white transition"
            />
          </div>

          {/* Color Scheme Picker */}
          <div className="rounded-xl border border-[var(--color-line)] p-3.5 bg-[var(--color-cream)]/50 space-y-2">
            <label className="block text-xs font-medium text-[var(--color-ink)]">
              Branch brand palette
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {PRESET_COLOR_THEMES.map((theme) => {
                const isSelected = colorThemeId === theme.id
                return (
                  <button
                    key={theme.id}
                    type="button"
                    title={theme.description}
                    onClick={() => {
                      setColorThemeId(theme.id)
                      setAccentColor(theme.accent)
                    }}
                    className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition cursor-pointer ${
                      isSelected
                        ? 'border-[var(--color-ink)] bg-white font-medium shadow-xs'
                        : 'border-[var(--color-line)] bg-white/70 text-[var(--color-muted)] hover:bg-white'
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0"
                      style={{ backgroundColor: theme.accent }}
                    />
                    <span className="truncate">{theme.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--color-muted)] mb-1">
              Notes
            </label>
            <textarea
              rows={2}
              placeholder="Private notes about requirements or setup…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] focus:bg-white transition resize-none"
            />
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--color-line)]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm text-[var(--color-muted)] hover:bg-[var(--color-cream)] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim() || !ownerEmail.trim()}
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 transition"
            >
              {submitting ? 'Creating…' : 'Create organization'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
