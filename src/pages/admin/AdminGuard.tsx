import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { LoadingScreen } from '../../components/ui/LoadingScreen'
import { AdminPage } from './AdminPage'

export function AdminGuard() {
  const { profile, loading } = useAuth()

  if (loading) {
    return <LoadingScreen message="Verifying platform admin privileges…" />
  }

  const isSuper = Boolean(profile?.isSuperAdmin || profile?.userType === 'super_admin')

  if (!isSuper) {
    return <Navigate to="/" replace />
  }

  return <AdminPage />
}
