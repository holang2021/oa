// ============================================================
// 认证上下文 — 管理登录状态和 JWT
// ============================================================
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getCurrentUser, logout as doLogout, type UserInfo } from '../services/authService'
import { isAuthenticated } from '../services/api'

interface AuthState {
  user: UserInfo | null
  isLoggedIn: boolean
  loading: boolean
  logout: () => void
  refresh: () => void
}

const AuthContext = createContext<AuthState>({
  user: null,
  isLoggedIn: false,
  loading: true,
  logout: () => {},
  refresh: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    if (isAuthenticated()) {
      const currentUser = getCurrentUser()
      setUser(currentUser)
    } else {
      setUser(null)
    }
  }, [])

  const logout = useCallback(() => {
    doLogout()
    setUser(null)
  }, [])

  useEffect(() => {
    refresh()
    setLoading(false)
  }, [refresh])

  return (
    <AuthContext.Provider value={{ user, isLoggedIn: !!user, loading, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

export default AuthContext
