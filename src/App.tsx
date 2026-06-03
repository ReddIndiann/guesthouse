import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'
import { AuthProvider } from './context/AuthContext'
import { RbacProvider, useRbac } from './context/RbacContext'
import { GuestplaceProvider } from './context/GuestplaceContext'
import { AccessPage } from './pages/AccessPage'
import { BookingsPage } from './pages/BookingsPage'
import { DashboardPage } from './pages/DashboardPage'
import { GuestsPage } from './pages/GuestsPage'
import { LoginPage } from './pages/LoginPage'
import { MessagesPage } from './pages/MessagesPage'
import { SettingsPage } from './pages/SettingsPage'
import { RoomsPage } from './pages/RoomsPage'

function AccessGuard() {
  const { can, loading } = useRbac()
  if (loading) return null
  if (!can('roles.view') && !can('groups.view') && !can('users.view')) {
    return <Navigate to="/" replace />
  }
  return <AccessPage />
}

function AppShell() {
  return (
    <RbacProvider>
      <GuestplaceProvider>
        <AppLayout />
      </GuestplaceProvider>
    </RbacProvider>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="rooms" element={<RoomsPage />} />
              <Route path="bookings" element={<BookingsPage />} />
              <Route path="guests" element={<GuestsPage />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="access" element={<AccessGuard />} />
            </Route>
          </Route>
          <Route path="users" element={<Navigate to="/access" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
