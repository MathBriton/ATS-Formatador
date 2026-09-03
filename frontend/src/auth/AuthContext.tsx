import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { api, session } from '../api'

interface AuthState {
  email: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(() => (session.token ? session.email : null))

  const login = useCallback(async (e: string, password: string) => {
    const auth = await api.login(e, password)
    session.save(auth)
    setEmail(auth.email)
  }, [])

  const register = useCallback(async (e: string, password: string) => {
    const auth = await api.register(e, password)
    session.save(auth)
    setEmail(auth.email)
  }, [])

  const logout = useCallback(() => {
    session.clear()
    setEmail(null)
  }, [])

  const value = useMemo<AuthState>(
    () => ({ email, isAuthenticated: email !== null, login, register, logout }),
    [email, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
