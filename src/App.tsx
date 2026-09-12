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

function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  )
}

export default App
