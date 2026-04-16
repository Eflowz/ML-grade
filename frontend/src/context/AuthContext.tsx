import { createContext, useContext, useState, type ReactNode } from 'react'
import api from '../api/client'

interface AuthState {
  token: string | null
  username: string | null
  isAdmin: boolean
}

interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({
    token: localStorage.getItem('auth_token'),
    username: localStorage.getItem('auth_username'),
    isAdmin: localStorage.getItem('auth_is_admin') === 'true',
  })

  const login = async (username: string, password: string) => {
    const res = await api.post<{ token: string; username: string; is_admin: boolean }>('/api/login', {
      username,
      password,
    })
    localStorage.setItem('auth_token', res.data.token)
    localStorage.setItem('auth_username', res.data.username)
    localStorage.setItem('auth_is_admin', res.data.is_admin.toString())
    setAuth({ token: res.data.token, username: res.data.username, isAdmin: res.data.is_admin })
  }

  const logout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_username')
    localStorage.removeItem('auth_is_admin')
    setAuth({ token: null, username: null, isAdmin: false })
  }

  return (
    <AuthContext.Provider value={{ ...auth, login, logout, isAuthenticated: !!auth.token }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
