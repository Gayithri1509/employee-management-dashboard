import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { useCapabilities } from './hooks/useCapabilities'
import { getHomePath } from './types/navigation'
import AppLayout from './layouts/AppLayout'
import RequireCapability from './routes/RequireCapability'
import SignIn from './pages/SignIn'
import OverviewPage from './pages/OverviewPage'
import EmployeesPage from './pages/EmployeesPage'
import DepartmentsPage from './pages/DepartmentsPage'
import ActivityPage from './pages/ActivityPage'
import InsightsPage from './pages/InsightsPage'
import MyProfilePage from './pages/MyProfilePage'
import AccessDenied from './pages/AccessDenied'

/** "/" has no fixed destination -- it resolves to whatever the viewer's own capabilities allow. */
function RootRedirect() {
  const capabilities = useCapabilities()
  return <Navigate to={getHomePath(capabilities)} replace />
}

// loading -> a loading state; no session -> SignIn for any path (refresh-safe,
// since AuthContext re-derives the session on mount); authenticated -> the
// full app shell with role-aware routes. This is a UI convenience gate, not
// a security boundary -- see src/contexts/AuthContext.tsx. Route-level
// authorization (RequireCapability) and the database (RLS/RPCs) are what
// actually enforce access, independently of this gate and of each other.
function AuthGate() {
  const { loading, session } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    )
  }

  if (!session) {
    return <SignIn />
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<RootRedirect />} />
        <Route
          path="/dashboard"
          element={
            <RequireCapability capability="canViewEmployees">
              <OverviewPage />
            </RequireCapability>
          }
        />
        <Route
          path="/employees"
          element={
            <RequireCapability capability="canViewEmployees">
              <EmployeesPage />
            </RequireCapability>
          }
        />
        <Route
          path="/departments"
          element={
            <RequireCapability capability="canManageDepartments">
              <DepartmentsPage />
            </RequireCapability>
          }
        />
        <Route
          path="/activity"
          element={
            <RequireCapability capability="canViewActivity">
              <ActivityPage />
            </RequireCapability>
          }
        />
        <Route
          path="/insights"
          element={
            <RequireCapability capability="canViewInsights">
              <InsightsPage />
            </RequireCapability>
          }
        />
        <Route
          path="/my-profile"
          element={
            <RequireCapability capability="canViewOwnProfile">
              <MyProfilePage />
            </RequireCapability>
          }
        />
        <Route path="/access-denied" element={<AccessDenied />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
