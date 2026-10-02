import { useState, useEffect } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import type { Organization, PropertyItem } from '../../types/tenant'

interface AdminPropertiesTabProps {
  organizations: Organization[]
}

export function AdminPropertiesTab({ organizations }: AdminPropertiesTabProps) {
  const [properties, setProperties] = useState<PropertyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function loadAllProperties() {
      setLoading(true)
      try {
        const snap = await getDocs(collection(db, 'properties'))
        const items: PropertyItem[] = snap.docs.map((d) => {
          const data = d.data()
          return {
            id: d.id,
            organizationId: data.organizationId || '',
            name: data.name || data.settings?.name || 'Main Property',
            code: data.code,
            address: data.address || data.settings?.address,
            phone: data.phone || data.settings?.phone,
            createdAt: data.createdAt || '',
            settings: data.settings,
          }
        })
        setProperties(items)
      } catch (err) {
        console.error('Failed to load properties:', err)
      } finally {
        setLoading(false)
      }
    }
    loadAllProperties()
  }, [])

  const orgMap = new Map(organizations.map((o) => [o.id, o.name]))

  const filteredProperties = properties.filter((p) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    const orgName = orgMap.get(p.organizationId) || ''
    return (
      p.name.toLowerCase().includes(q) ||
      (p.code && p.code.toLowerCase().includes(q)) ||
      orgName.toLowerCase().includes(q) ||
      (p.address && p.address.toLowerCase().includes(q))
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search branches by name or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-line)] bg-white px-3.5 py-2 pl-9 text-sm text-[var(--color-ink)] placeholder-[var(--color-muted)] focus:outline-none focus:border-[var(--color-accent)] transition"
          />
          <svg
            className="absolute left-3 top-2.5 h-4 w-4 text-[var(--color-muted)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="text-xs text-[var(--color-muted)]">
          Total branches: <span className="font-semibold text-[var(--color-ink)]">{properties.length}</span>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-line)] border-t-[var(--color-accent)]" />
          <p className="text-xs text-[var(--color-muted)]">Loading branch directory…</p>
        </div>
      ) : filteredProperties.length === 0 ? (
        <div className="rounded-2xl border border-[var(--color-line)] bg-white p-12 text-center">
          <p className="text-sm font-medium text-[var(--color-ink)]">No branches found</p>
          <p className="text-xs text-[var(--color-muted)] mt-1">Properties added by organizations will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProperties.map((prop) => {
            const orgName = orgMap.get(prop.organizationId) || 'Independent property'

            return (
              <div
                key={prop.id}
                className="overflow-hidden rounded-2xl border border-[var(--color-line)] bg-white hover:border-gray-300 transition shadow-2xs flex flex-col"
              >
                {prop.imageUrl && (
                  <div className="h-32 w-full overflow-hidden bg-[var(--color-cream)] border-b border-[var(--color-line)]">
                    <img
                      src={prop.imageUrl}
                      alt={prop.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}

                <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-[var(--color-ink)] line-clamp-1">{prop.name}</h4>
                        <p className="text-xs text-[var(--color-accent)] font-medium mt-0.5">{orgName}</p>
                      </div>
                      {prop.code && (
                        <span className="rounded bg-[var(--color-cream)] border border-[var(--color-line)] px-2 py-0.5 text-[10px] font-mono text-[var(--color-muted)] shrink-0">
                          {prop.code}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-[var(--color-muted)] border-t border-[var(--color-line)] pt-3">
                    {prop.address && (
                      <p className="flex items-center gap-1.5 text-[var(--color-ink)]">
                        <svg className="w-3.5 h-3.5 text-[var(--color-accent)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 21s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 7.2c0 7.3-8 11.8-8 11.8z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span className="truncate">{prop.address}</span>
                      </p>
                    )}

                    {prop.latitude != null && prop.longitude != null && (
                      <a
                        href={`https://www.google.com/maps?q=${prop.latitude},${prop.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-[var(--color-accent)] hover:underline"
                      >
                        <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="9" />
                          <path strokeLinecap="round" d="M12 3v3m0 12v3M3 12h3m12 0h3" />
                        </svg>
                        <span>{Number(prop.latitude).toFixed(4)}, {Number(prop.longitude).toFixed(4)} ↗</span>
                      </a>
                    )}

                    {prop.phone && <p className="text-[11px]">Phone: {prop.phone}</p>}
                    <p className="text-[10px] text-gray-400 font-mono">ID: {prop.id}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
