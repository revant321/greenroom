import { Navigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { signInWithApple, signInWithGoogle } from '../services/authService'

/**
 * Login screen — Google + Apple sign-in buttons.
 *
 * `signInWithOAuth` redirects the browser away to the provider, so the code
 * after `await` only runs on failure. On success, the user returns to this
 * URL, AuthProvider picks up the session, and the <Navigate> at the top
 * bounces them into the app.
 */
export default function LoginPage() {
  const { user, loading } = useAuth()
  const [error, setError] = useState<string | null>(null)

  if (loading) return null
  if (user) return <Navigate to="/" replace />

  async function handleGoogle() {
    setError(null)
    try {
      await signInWithGoogle()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Google sign-in failed')
    }
  }

  async function handleApple() {
    setError(null)
    try {
      await signInWithApple()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Apple sign-in failed')
    }
  }

  return (
    <div className="login-page">
      <div className="login-content">
        <h1 className="login-title">greenroom</h1>
        <p className="login-subtitle">Your personal theater organizer</p>

        <div className="login-buttons">
          <button className="login-button login-button--apple" onClick={handleApple}>
            <span aria-hidden></span>
            Sign in with Apple
          </button>
          <button className="login-button login-button--google" onClick={handleGoogle}>
            <span aria-hidden>G</span>
            Sign in with Google
          </button>
        </div>

        {error && <div className="login-error">{error}</div>}
      </div>
    </div>
  )
}
