export interface ColorTheme {
  id: string
  name: string
  accent: string
  accentSoft: string
  description: string
}

export const PRESET_COLOR_THEMES: ColorTheme[] = [
  {
    id: 'sage',
    name: 'Forest Sage',
    accent: '#3d6b4f',
    accentSoft: '#e8f0eb',
    description: 'Boutique botanical green with calming natural tones',
  },
  {
    id: 'navy',
    name: 'Seaside Navy',
    accent: '#23496d',
    accentSoft: '#e5edf5',
    description: 'Refined maritime blue inspired by ocean shores',
  },
  {
    id: 'terracotta',
    name: 'Warm Terracotta',
    accent: '#9e4e36',
    accentSoft: '#f9ece8',
    description: 'Sun-baked clay and rustic Mediterranean brick',
  },
  {
    id: 'burgundy',
    name: 'Heritage Burgundy',
    accent: '#7d2438',
    accentSoft: '#f6e7eb',
    description: 'Classic noble wine tone for grand manor retreats',
  },
  {
    id: 'teal',
    name: 'Deep Teal',
    accent: '#1d6268',
    accentSoft: '#e3f0f1',
    description: 'Luxe mineral peacock teal with modern elegance',
  },
  {
    id: 'amber',
    name: 'Amber Bronze',
    accent: '#8a5e1f',
    accentSoft: '#f8f0e3',
    description: 'Warm golden ochre with vintage leather accents',
  },
  {
    id: 'slate',
    name: 'Espresso Slate',
    accent: '#383a42',
    accentSoft: '#eaebee',
    description: 'Sleek minimalist charcoal with architectural warmth',
  },
  {
    id: 'olive',
    name: 'Olive Grove',
    accent: '#55662f',
    accentSoft: '#ecf0e2',
    description: 'Rustic Tuscan olive and herbal undertones',
  },
]

export const DEFAULT_THEME = PRESET_COLOR_THEMES[0]

export function getThemeById(id?: string): ColorTheme | undefined {
  if (!id) return undefined
  return PRESET_COLOR_THEMES.find((t) => t.id === id)
}

/**
 * Calculates a delicate, matching tinted soft background for any custom HEX color
 */
export function generateSoftAccent(hex: string): string {
  try {
    let c = hex.replace('#', '').trim()
    if (c.length === 3) {
      c = c
        .split('')
        .map((x) => x + x)
        .join('')
    }
    if (c.length !== 6) return '#e8f0eb'

    const r = parseInt(c.substring(0, 2), 16)
    const g = parseInt(c.substring(2, 4), 16)
    const b = parseInt(c.substring(4, 6), 16)

    // Blend 11% color with 89% cream-white for a warm, soft tinted surface
    const softR = Math.round(r * 0.11 + 250 * 0.89)
    const softG = Math.round(g * 0.11 + 248 * 0.89)
    const softB = Math.round(b * 0.11 + 245 * 0.89)

    return `rgb(${softR}, ${softG}, ${softB})`
  } catch {
    return '#e8f0eb'
  }
}

/**
 * Applies the color theme to the HTML root element
 */
export function applyThemeToDocument(accentColor?: string, colorThemeId?: string) {
  if (typeof document === 'undefined') return

  const preset = getThemeById(colorThemeId)
  const accent = preset?.accent || accentColor || DEFAULT_THEME.accent
  const accentSoft = preset?.accentSoft || (accentColor ? generateSoftAccent(accentColor) : DEFAULT_THEME.accentSoft)

  document.documentElement.style.setProperty('--color-accent', accent)
  document.documentElement.style.setProperty('--color-accent-soft', accentSoft)
}
