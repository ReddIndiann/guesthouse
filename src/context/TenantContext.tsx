import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAuth } from './AuthContext'
import {
  createOrgProperty,
  getOrganization,
  subscribeToOrgProperties,
} from '../lib/tenants'
import type { CreatePropertyInput, Organization, PropertyItem } from '../types/tenant'

interface TenantContextValue {
  organization: Organization | null
  properties: PropertyItem[]
  currentPropertyId: string
  currentProperty: PropertyItem | null
  setCurrentPropertyId: (id: string) => void
  addProperty: (input: CreatePropertyInput) => Promise<string>
  loading: boolean
  isSuperAdmin: boolean
  isOrgAdmin: boolean
  isPendingApproval: boolean
}

const TenantContext = createContext<TenantContextValue | null>(null)

const STORAGE_KEY = 'guestplace_active_property_id'

export function TenantProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [properties, setProperties] = useState<PropertyItem[]>([])
  const [currentPropertyId, setCurrentPropertyIdState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) || profile?.propertyId || ''
  })
  const [loading, setLoading] = useState(true)

  const isSuperAdmin = Boolean(profile?.isSuperAdmin || profile?.userType === 'super_admin')
  const isOrgAdmin = Boolean(profile?.userType === 'org_admin' || isSuperAdmin)
  const isPendingApproval = Boolean(profile?.pendingApproval || organization?.status === 'pending_approval')

  // Load organization if user belongs to one
  useEffect(() => {
    if (!profile?.organizationId) {
      setOrganization(null)
      return
    }

    let isMounted = true
    getOrganization(profile.organizationId)
      .then((org) => {
        if (isMounted) setOrganization(org)
      })
      .catch((err) => {
        console.error('Failed to load organization:', err)
      })

    return () => {
      isMounted = false
    }
  }, [profile?.organizationId])

  // Subscribe to properties for this organization
  useEffect(() => {
    if (!profile) {
      setProperties([])
      setLoading(false)
      return
    }

    if (profile.organizationId) {
      const unsub = subscribeToOrgProperties(
        profile.organizationId,
        (items) => {
          setProperties(items)
          setLoading(false)
        },
        (err) => {
          console.error('Failed to subscribe to organization properties:', err)
          setLoading(false)
        },
      )
      return unsub
    }

    // Fallback for single-property instances without an organization record
    if (profile.propertyId) {
      setProperties([
        {
          id: profile.propertyId,
          organizationId: 'default',
          name: 'Main Property',
          createdAt: profile.createdAt,
        },
      ])
    }
    setLoading(false)
  }, [profile])

  // Sync active property ID
  useEffect(() => {
    if (properties.length === 0) {
      if (profile?.propertyId) {
        setCurrentPropertyIdState(profile.propertyId)
      }
      return
    }

    // If currentPropertyId is not in properties, or not set, default to first or profile.propertyId
    const exists = properties.some((p) => p.id === currentPropertyId)
    if (!exists) {
      const preferred =
        properties.find((p) => p.id === profile?.propertyId)?.id || properties[0].id
      setCurrentPropertyIdState(preferred)
      localStorage.setItem(STORAGE_KEY, preferred)
    }
  }, [properties, currentPropertyId, profile?.propertyId])

  const setCurrentPropertyId = useCallback((id: string) => {
    setCurrentPropertyIdState(id)
    localStorage.setItem(STORAGE_KEY, id)
  }, [])

  const currentProperty = useMemo(() => {
    return properties.find((p) => p.id === currentPropertyId) || null
  }, [properties, currentPropertyId])

  const addProperty = useCallback(
    async (input: CreatePropertyInput) => {
      if (!profile?.organizationId) {
        throw new Error('No organization found to add property to')
      }
      const newId = await createOrgProperty(
        profile.organizationId,
        input,
        properties.length,
      )
      setCurrentPropertyId(newId)
      return newId
    },
    [profile?.organizationId, properties.length, setCurrentPropertyId],
  )

  const value = useMemo(
    () => ({
      organization,
      properties,
      currentPropertyId,
      currentProperty,
      setCurrentPropertyId,
      addProperty,
      loading,
      isSuperAdmin,
      isOrgAdmin,
      isPendingApproval,
    }),
    [
      organization,
      properties,
      currentPropertyId,
      currentProperty,
      setCurrentPropertyId,
      addProperty,
      loading,
      isSuperAdmin,
      isOrgAdmin,
      isPendingApproval,
    ],
  )

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

export function useTenant() {
  const ctx = useContext(TenantContext)
  if (!ctx) throw new Error('useTenant must be used within TenantProvider')
  return ctx
}
