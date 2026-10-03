import type { PropertyCategory } from '../../types'

interface PropertyTypeIconProps {
  type?: PropertyCategory | string
  className?: string
}

export function PropertyTypeIcon({ type, className = 'w-5 h-5' }: PropertyTypeIconProps) {
  switch (type) {
    case 'hotel':
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {/* Hotel Building */}
          <path d="M3 21h18" />
          <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
          <path d="M9 7h1" />
          <path d="M14 7h1" />
          <path d="M9 11h1" />
          <path d="M14 11h1" />
          <path d="M9 15h1" />
          <path d="M14 15h1" />
          <path d="M10 21v-3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3" />
        </svg>
      )

    case 'airbnb':
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {/* Key / Apartment Access */}
          <path d="M21 2l-2 2m-1.5 1.5L14 9l-1.5-1.5L11 9l-1-1-1.5 1.5" />
          <circle cx="7.5" cy="15.5" r="4.5" />
          <path d="M15.5 7.5L21 2" />
          <path d="M18.5 4.5l1.5 1.5" />
        </svg>
      )

    case 'resort':
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {/* Resort Palm & Sun / Retreat */}
          <circle cx="17" cy="7" r="3" />
          <path d="M2 21h20" />
          <path d="M12 21c0-4 1-8 4-10" />
          <path d="M16 11c-2-3-6-3-9 0" />
          <path d="M16 11c1-4-1-7-4-8" />
          <path d="M16 11c3-2 6-1 7 2" />
          <path d="M3 19c2-1 4-1 6 0s4 1 6 0" />
        </svg>
      )

    case 'guesthouse':
    default:
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {/* Guest House / Lodge */}
          <path d="M3 10.5L12 3l9 7.5V20a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 20v-9.5z" />
          <path d="M9 21v-6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v6" />
          <path d="M10 9h4" />
        </svg>
      )
  }
}

export function getPropertyTypeLabel(type?: string): string {
  switch (type) {
    case 'hotel':
      return 'Boutique Hotel'
    case 'airbnb':
      return 'Airbnb / Apartment'
    case 'resort':
      return 'Resort / Retreat'
    case 'guesthouse':
    default:
      return 'Guest House / Lodge'
  }
}
