import { useEffect, useRef, useState } from 'react'
import QRCode from 'react-qr-code'
import { Panel } from '../ui/Panel'
import { ensureSuggestionToken, suggestionFormUrl } from '../../lib/suggestions'
import type { PropertySettings } from '../../types'

interface SuggestionQRPanelProps {
  propertyId: string
  settings: PropertySettings
}

export function SuggestionQRPanel({ propertyId, settings }: SuggestionQRPanelProps) {
  const [token, setToken] = useState<string | null>(settings.suggestionToken ?? null)
  const [loading, setLoading] = useState(!settings.suggestionToken)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    ensureSuggestionToken(propertyId, settings)
      .then((t) => {
        if (!cancelled) setToken(t)
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [propertyId, settings.name, settings.suggestionToken])

  if (loading || !token) {
    return (
      <Panel>
        <p className="text-sm text-[var(--color-muted)]">Preparing suggestion QR code…</p>
      </Panel>
    )
  }

  const url = suggestionFormUrl(token)

  const handlePrint = () => {
    const content = printRef.current
    if (!content) return
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Suggestion QR — ${settings.name}</title>
          <style>
            body { font-family: system-ui, sans-serif; text-align: center; padding: 48px 24px; }
            h1 { font-size: 24px; margin-bottom: 8px; }
            p { color: #666; margin-bottom: 32px; }
            svg { width: 200px; height: 200px; }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `)
    win.document.close()
    win.focus()
    win.print()
  }

  return (
    <Panel>
      <h2 className="mb-1 text-sm font-semibold text-[var(--color-ink)]">Guest suggestions</h2>
      <p className="mb-6 text-sm text-[var(--color-muted)]">
        Print this QR code and place it at reception. Guests scan it to leave feedback — no app
        needed.
      </p>

      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        <div
          ref={printRef}
          className="flex flex-col items-center rounded-2xl border border-[var(--color-line)] bg-white p-6"
        >
          <h3 className="mb-1 text-lg font-semibold">{settings.name}</h3>
          <p className="mb-4 text-sm text-[var(--color-muted)]">Scan to share a suggestion</p>
          <QRCode value={url} size={160} />
        </div>

        <div className="flex flex-1 flex-col gap-3">
          <div className="rounded-lg bg-[var(--color-cream)] p-3">
            <p className="text-xs text-[var(--color-muted)]">Link</p>
            <p className="mt-1 break-all text-sm font-medium">{url}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(url)}
              className="rounded-lg border border-[var(--color-line)] px-4 py-2 text-sm font-medium"
            >
              Copy link
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white"
            >
              Print QR poster
            </button>
          </div>
          <p className="text-xs text-[var(--color-muted)]">
            View incoming suggestions under Mail & Messages → Suggestions.
          </p>
        </div>
      </div>
    </Panel>
  )
}
