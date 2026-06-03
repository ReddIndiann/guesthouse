import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { LoadingScreen } from '../ui/LoadingScreen'
import { AccessDeniedPage } from '../../pages/AccessDeniedPage'

export function ProtectedRoute() {
  const { user, profile, loading, profileError, signOut } = useAuth()

  if (loading) return <LoadingScreen message="Checking session…" />
  if (!user) return <Navigate to="/login" replace />
  if (profileError || !profile) {
    return <AccessDeniedPage message={profileError ?? 'Access denied'} onSignOut={signOut} />
  }

  return <Outlet />
}
