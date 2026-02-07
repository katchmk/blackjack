import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { api, setToken, clearToken } from '../lib/api'

interface User {
  id: string
  username: string
  displayName: string
  bankroll: number
}

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
  login: (username: string, password: string) => Promise<void>
  signup: (username: string, password: string, displayName: string) => Promise<void>
  logout: () => void
}

interface AuthResponse {
  token: string
  user: User
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuthProvider(): AuthState {
  const hasToken = !!localStorage.getItem('blackjack_token')
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(hasToken)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('blackjack_token')
    if (!token) return

    let cancelled = false
    api.get<{ user: User }>('/auth/me').then(
      (data) => {
        if (cancelled) return
        setUser(data.user)
        setLoading(false)
      },
      () => {
        if (cancelled) return
        clearToken()
        setLoading(false)
      }
    )

    return () => { cancelled = true }
  }, [])

  const login = useCallback(async (username: string, password: string) => {
    setError(null)
    try {
      const data = await api.post<AuthResponse>('/auth/login', { username, password })
      setToken(data.token)
      setUser(data.user)
    } catch (err) {
      const msg = (err as Error).message
      setError(msg)
      throw err
    }
  }, [])

  const signup = useCallback(
    async (username: string, password: string, displayName: string) => {
      setError(null)
      try {
        const data = await api.post<AuthResponse>('/auth/signup', {
          username,
          password,
          displayName,
        })
        setToken(data.token)
        setUser(data.user)
      } catch (err) {
        const msg = (err as Error).message
        setError(msg)
        throw err
      }
    },
    []
  )

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
  }, [])

  return { user, loading, error, login, signup, logout }
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
