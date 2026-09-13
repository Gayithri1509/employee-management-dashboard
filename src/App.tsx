import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Dashboard from './pages/Dashboard'
import SignIn from './pages/SignIn'

// Stage 3.1 auth gate: loading -> a loading state; no session -> SignIn;
// authenticated -> the existing Dashboard, unchanged. This is a UI
// convenience gate, not a security boundary -- see src/contexts/AuthContext.tsx.
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

  return <Dashboard />
}

// Stage 3.3 routing groundwork: a single catch-all route today, preserving
// the existing single-page/anchor-scroll behavior unchanged. Introduced now
// so role-specific pages (RBAC nav, Settings, self-service) can be added as
// their own <Route> entries later without a second restructuring.
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/*" element={<AuthGate />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
