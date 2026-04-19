import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getSession, onAuthStateChange } from '../services/authService'

/**
 * AuthProvider + useAuth hook.
 *
 * Pattern: a React Context provides { user, session, loading } to the whole app.
 * - On mount, it checks for an existing session (the Supabase client auto-restores
 *   it from localStorage, so returning users stay logged in).
 * - It subscribes to auth state changes so the UI reacts immediately to sign in/out.
 * - `loading` is true until that first session check resolves — this prevents a
 *   flash of the login screen while Supabase is still figuring out who you are.
 */

type AuthContextValue = {
  user: User | null
  session: Session | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Check for an existing session synchronously from local storage.
    getSession()
      .then((s) => setSession(s))
      .finally(() => setLoading(false))

    // 2. Subscribe to future changes (login, logout, token refresh).
    const subscription = onAuthStateChange((s) => setSession(s))

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, session, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
