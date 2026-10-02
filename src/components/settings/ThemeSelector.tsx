import { useState } from 'react'
import {
  PRESET_COLOR_THEMES,
  generateSoftAccent,
  type ColorTheme,
} from '../../utils/theme'

interface ThemeSelectorProps {
  valueThemeId?: string
  valueAccentColor?: string
  disabled?: boolean
  onChange: (themeId: string | undefined, accentColor: string | undefined) => void
}

export function ThemeSelector({
  valueThemeId,
  valueAccentColor,
  disabled,
  onChange,
}: ThemeSelectorProps) {
  const currentAccent = valueAccentColor || '#3d6b4f'
  const isCustom = !valueThemeId || !PRESET_COLOR_THEMES.some((t) => t.id === valueThemeId)

  const [customHex, setCustomHex] = useState(isCustom ? currentAccent : '#3d6b4f')

  const handleSelectPreset = (theme: ColorTheme) => {
    if (disabled) return
    onChange(theme.id, theme.accent)
  }

  const handleCustomColorChange = (hex: string) => {
    if (disabled) return
    setCustomHex(hex)
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      onChange(undefined, hex)
    }
  }

  const activeAccent = valueAccentColor || '#3d6b4f'
  const activeSoft = generateSoftAccent(activeAccent)

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-[var(--color-ink)]">Branch Theme & Brand Color</h3>
        <p className="text-xs text-[var(--color-muted)] mt-0.5">
          Select a signature palette for this branch. Navigation highlights, buttons, badges, and posters will match this theme.
        </p>
      </div>

      {/* Preset Palettes Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {PRESET_COLOR_THEMES.map((theme) => {
          const isSelected = valueThemeId === theme.id || (!valueThemeId && valueAccentColor === theme.accent)

          return (
            <button
              key={theme.id}
              type="button"
              disabled={disabled}
              onClick={() => handleSelectPreset(theme)}
              className={`flex flex-col items-start p-3 rounded-xl border text-left transition relative cursor-pointer disabled:cursor-not-allowed ${
                isSelected
                  ? 'border-[var(--color-ink)] ring-2 ring-[var(--color-ink)]/20 bg-white shadow-xs'
                  : 'border-[var(--color-line)] bg-white/60 hover:bg-white hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div
                  className="w-6 h-6 rounded-full border border-black/10 shadow-2xs"
                  style={{ backgroundColor: theme.accent }}
                />
                {isSelected && (
                  <span className="text-[10px] font-semibold text-[var(--color-ink)]">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs font-semibold text-[var(--color-ink)] truncate w-full">{theme.name}</p>
              <p className="text-[10px] text-[var(--color-muted)] line-clamp-1 mt-0.5">{theme.description}</p>
            </button>
          )
        })}
      </div>

      {/* Custom Color Option & Live Preview */}
      <div className="rounded-xl border border-[var(--color-line)] bg-[var(--color-cream)] p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-[var(--color-ink)] shrink-0">
              Or custom brand HEX:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                disabled={disabled}
                value={customHex.startsWith('#') ? customHex : '#3d6b4f'}
                onChange={(e) => handleCustomColorChange(e.target.value)}
                className="w-8 h-8 rounded-lg border border-[var(--color-line)] cursor-pointer disabled:opacity-50 p-0.5 bg-white"
              />
              <input
                type="text"
                disabled={disabled}
                value={customHex}
                placeholder="#3d6b4f"
                onChange={(e) => handleCustomColorChange(e.target.value)}
                className="w-24 rounded-lg border border-[var(--color-line)] bg-white px-2.5 py-1 text-xs font-mono text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-ink)] disabled:opacity-50"
              />
            </div>
          </div>

          {/* Live Preview Sample */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[var(--color-muted)]">Live sample:</span>
            <span
              className="rounded-full px-2.5 py-0.5 text-[10px] font-medium transition-colors"
              style={{ backgroundColor: activeSoft, color: activeAccent }}
            >
              Badge
            </span>
            <button
              type="button"
              tabIndex={-1}
              className="rounded-lg px-3 py-1 text-xs font-medium text-white shadow-2xs transition-colors"
              style={{ backgroundColor: activeAccent }}
            >
              Button
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
