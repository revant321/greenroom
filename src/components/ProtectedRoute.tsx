import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'

/**
 * Wraps routes that require a logged-in user. Three states:
 * - loading: auth check hasn't finished yet → render nothing (avoids a flash)
 * - no user: redirect to /login
 * - logged in: render children
 */
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}
