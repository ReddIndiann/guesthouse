import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import type { Permission } from '../../types/auth'
import { useRbac } from '../../context/RbacContext'

interface RequirePermissionProps {
  permission: Permission
  children: ReactNode
}

export function RequirePermission({ permission, children }: RequirePermissionProps) {
  const { can, loading } = useRbac()
  if (loading) return null
  if (!can(permission)) return <Navigate to="/" replace />
  return children
}
