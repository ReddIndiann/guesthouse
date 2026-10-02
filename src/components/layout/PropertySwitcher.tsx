import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTenant } from '../../context/TenantContext'
import { AddPropertyDialog } from './AddPropertyDialog'

export function PropertySwitcher() {
  const {
    organization,
    properties,
    currentPropertyId,
    currentProperty,
    setCurrentPropertyId,
    isSuperAdmin,
    isOrgAdmin,
  } = useTenant()

  const [open, setOpen] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const displayName = currentProperty?.name || organization?.name || 'Main Property'
  const displayCode = currentProperty?.code || (properties.length > 1 ? `Property 1` : '')

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="group flex w-full items-center justify-between gap-2 rounded-xl border border-[var(--color-line)] bg-[var(--color-cream)] px-3 py-2 text-left transition hover:bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white border border-[var(--color-line)] text-[var(--color-accent)] shadow-xs">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 21h18M5 21V7l8-4v18M13 7l6 3v11M9 9h1M9 13h1M9 17h1M15 13h1M15 17h1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-xs font-semibold text-[var(--color-ink)]">
                {displayName}
              </p>
              {displayCode && (
                <span className="shrink-0 rounded bg-black/5 px-1 py-0.2 text-[10px] font-medium text-[var(--color-muted)]">
                  {displayCode}
                </span>
              )}
            </div>
            {organization && (
              <p className="truncate text-[10px] text-[var(--color-muted)]">
                {organization.name}
              </p>
            )}
          </div>
        </div>

        <svg
          className={`h-4 w-4 shrink-0 text-[var(--color-muted)] transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-xl border border-[var(--color-line)] bg-white p-1.5 shadow-lg animate-in fade-in duration-100">
          <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
            Properties ({properties.length || 1})
          </div>

          <div className="max-h-56 overflow-y-auto space-y-0.5">
            {properties.map((p) => {
              const isSelected = p.id === currentPropertyId
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setCurrentPropertyId(p.id)
                    setOpen(false)
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs transition ${
                    isSelected
                      ? 'bg-[var(--color-accent-soft)] font-medium text-[var(--color-accent)]'
                      : 'text-[var(--color-ink)] hover:bg-[var(--color-cream)]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 text-left">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0 border border-black/10 shadow-2xs"
                      style={{ backgroundColor: p.settings?.accentColor || '#3d6b4f' }}
                    />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.name}</p>
                      {p.code && <p className="text-[10px] text-[var(--color-muted)]">{p.code}</p>}
                    </div>
                  </div>
                  {isSelected && (
                    <svg className="h-4 w-4 shrink-0 text-[var(--color-accent)]" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>

          {isOrgAdmin && (
            <div className="mt-1 pt-1 border-t border-[var(--color-line)]">
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  setAddDialogOpen(true)
                }}
                className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent-soft)] transition"
              >
                <span>+</span> Add branch
              </button>
            </div>
          )}

          {isSuperAdmin && (
            <div className="mt-1 pt-1 border-t border-[var(--color-line)]">
              <Link
                to="/admin"
                onClick={() => setOpen(false)}
                className="flex w-full items-center justify-between rounded-lg bg-[var(--color-cream)] border border-[var(--color-line)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-ink)] hover:bg-white transition"
              >
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 text-[var(--color-accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  Platform admin
                </span>
                <span className="text-[10px] text-[var(--color-muted)]">/admin</span>
              </Link>
            </div>
          )}
        </div>
      )}

      <AddPropertyDialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} />
    </div>
  )
}
