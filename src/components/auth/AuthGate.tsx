import type { ReactNode } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { LoginForm } from './LoginForm'

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white/60 text-lg animate-pulse">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <LoginForm />
  }

  return <>{children}</>
}
