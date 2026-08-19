import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { AppLayout } from './components/layout/AppLayout'
import { AuthProvider } from './context/AuthContext'
import { RbacProvider, useRbac } from './context/RbacContext'
import { GuestplaceProvider } from './context/GuestplaceContext'
import { OperationsProvider } from './context/OperationsContext'
import { AccessPage } from './pages/AccessPage'
import { BookingsPage } from './pages/BookingsPage'
import { DashboardPage } from './pages/DashboardPage'
import { GuestsPage } from './pages/GuestsPage'
import { LoginPage } from './pages/LoginPage'
import { MessagesPage } from './pages/MessagesPage'
import { SettingsPage } from './pages/SettingsPage'
import { RoomsPage } from './pages/RoomsPage'
import { HousekeepingPage } from './pages/HousekeepingPage'
import { ReportsPage } from './pages/ReportsPage'
import { FolioPage } from './pages/FolioPage'
import { SuggestionPage } from './pages/SuggestionPage'

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
        <OperationsProvider>
          <AppLayout />
        </OperationsProvider>
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
          <Route path="/folio/:token" element={<FolioPage />} />
          <Route path="/suggestions/:token" element={<SuggestionPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route index element={<DashboardPage />} />
              <Route path="rooms" element={<RoomsPage />} />
              <Route path="bookings" element={<BookingsPage />} />
              <Route path="guests" element={<GuestsPage />} />
              <Route path="messages" element={<MessagesPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="housekeeping" element={<HousekeepingPage />} />
              <Route path="reports" element={<ReportsPage />} />
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
