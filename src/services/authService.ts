import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'

/**
 * Thin wrapper around Supabase auth. Components and hooks should call these
 * functions instead of touching `supabase.auth` directly — that way if we ever
 * swap auth providers or add offline handling, it all changes in one place.
 */

// Where the OAuth provider should send the user back after login.
// In dev this is http://localhost:5173/greenroom/, in prod it's the GitHub Pages URL.
// `window.location.origin` + Vite's BASE_URL gives us the right value in both.
function redirectTo(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}`
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

export function onAuthStateChange(callback: (session: Session | null) => void) {
  // Supabase calls `callback` whenever the session changes — sign in, sign out,
  // token refresh, etc. Returns a subscription; caller must unsubscribe on cleanup.
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session)
  })
  return data.subscription
}

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectTo() },
  })
  if (error) throw error
}

export async function signInWithApple() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'apple',
    options: { redirectTo: redirectTo() },
  })
  if (error) throw error
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
