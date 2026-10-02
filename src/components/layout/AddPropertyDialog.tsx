import { useState, useRef, type FormEvent, type ChangeEvent } from 'react'
import { useTenant } from '../../context/TenantContext'
import { compressImageFile } from '../../utils/image'
import { PRESET_COLOR_THEMES } from '../../utils/theme'

interface AddPropertyDialogProps {
  open: boolean
  onClose: () => void
}

export function AddPropertyDialog({ open, onClose }: AddPropertyDialogProps) {
  const { addProperty } = useTenant()
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload')
  const [uploadingImage, setUploadingImage] = useState(false)
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [colorThemeId, setColorThemeId] = useState('sage')
  const [accentColor, setAccentColor] = useState('#3d6b4f')
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
      if (fileInputRef.current) fileInputRef.current.value = ''
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
        setError(err.message || 'Unable to retrieve GPS coordinates')
      },
      { timeout: 10000, enableHighAccuracy: true },
    )
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setError(null)
    setSubmitting(true)
    const parsedLat = latitude.trim() !== '' ? parseFloat(latitude.trim()) : undefined
    const parsedLng = longitude.trim() !== '' ? parseFloat(longitude.trim()) : undefined

    try {
      await addProperty({
        name: name.trim(),
        code: code.trim() || undefined,
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        imageUrl: imageUrl.trim() || undefined,
        latitude: typeof parsedLat === 'number' && !isNaN(parsedLat) ? parsedLat : undefined,
        longitude: typeof parsedLng === 'number' && !isNaN(parsedLng) ? parsedLng : undefined,
        accentColor,
        colorThemeId,
      })
      setName('')
      setCode('')
      setAddress('')
      setPhone('')
      setImageUrl('')
      setLatitude('')
      setLongitude('')
      setColorThemeId('sage')
      setAccentColor('#3d6b4f')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add property')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-[var(--color-line)] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-[var(--color-line)]">
          <div>
            <h2 className="text-lg font-bold text-[var(--color-ink)]">Add New Property / Branch</h2>
            <p className="text-xs text-[var(--color-muted)] mt-0.5">
              Create a new branch under your organization
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1">
              Property Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Seaside Resort & Spa"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-cream)] px-3.5 py-2.5 text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:bg-white transition"
            />
          </div>

          {/* Photo / Logo Selection */}
          <div className="rounded-xl border border-[var(--color-line)] p-3.5 bg-[var(--color-cream)]/50 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                Branch Photo
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
                  Upload
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

            {imageMode === 'upload' ? (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="prop-image-file"
                />
                <label
                  htmlFor="prop-image-file"
                  className="flex items-center justify-center gap-2 w-full rounded-lg border border-dashed border-[var(--color-line)] bg-white px-3 py-2.5 text-xs text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-ink)] transition cursor-pointer"
                >
                  <span>{uploadingImage ? 'Processing…' : 'Click to select photo from device'}</span>
                </label>
              </div>
            ) : (
              <div>
                <input
                  type="url"
                  placeholder="https://..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 text-xs text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-accent)] transition"
                />
              </div>
            )}

            {imageUrl && (
              <div className="flex items-center gap-2.5 pt-1">
                <img src={imageUrl} alt="Preview" className="h-10 w-10 rounded-lg object-cover border border-[var(--color-line)]" />
                <span className="text-xs text-[var(--color-ink)] flex-1 truncate">Photo selected</span>
                <button
                  type="button"
                  onClick={() => setImageUrl('')}
                  className="text-xs text-rose-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1">
                Branch Code
              </label>
              <input
                type="text"
                placeholder="e.g. SEA-01"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-cream)] px-3.5 py-2.5 text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1">
                Contact Phone
              </label>
              <input
                type="text"
                placeholder="+1 555-0199"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-cream)] px-3.5 py-2.5 text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] mb-1">
              Address
            </label>
            <input
              type="text"
              placeholder="123 Ocean Drive, Suite 100"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-cream)] px-3.5 py-2.5 text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:bg-white transition"
            />
          </div>

          {/* GPS Coordinates */}
          <div className="rounded-xl border border-[var(--color-line)] p-3 bg-[var(--color-cream)]/50 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
                Coordinates (Lat / Lng)
              </label>
              <button
                type="button"
                onClick={handleDetectLocation}
                disabled={locatingGps}
                className="text-[11px] font-medium text-[var(--color-accent)] hover:underline disabled:opacity-50"
              >
                {locatingGps ? 'Detecting…' : 'Use GPS'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                step="any"
                placeholder="Latitude (e.g. 5.6037)"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-line)] bg-white px-2.5 py-1.5 text-xs text-[var(--color-ink)]"
              />
              <input
                type="number"
                step="any"
                placeholder="Longitude (e.g. -0.1870)"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-line)] bg-white px-2.5 py-1.5 text-xs text-[var(--color-ink)]"
              />
            </div>
          </div>

          {/* Color Scheme Picker */}
          <div className="rounded-xl border border-[var(--color-line)] p-3 bg-[var(--color-cream)]/50 space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)]">
              Branch Brand Palette
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
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
                    className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs transition cursor-pointer ${
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

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--color-line)]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm text-[var(--color-muted)] hover:bg-gray-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="rounded-xl bg-[var(--color-accent)] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-50 transition"
            >
              {submitting ? 'Creating…' : 'Create Property'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
