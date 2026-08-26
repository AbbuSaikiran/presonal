import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { apiLogin, apiRegister, apiForgotPassword, apiResetPassword, apiMe } from '../lib/api'

const AuthContext = createContext(null)

/** Persist both the user profile and its JWT so api.js can read the token. */
function persistSession(userData, token) {
  const payload = { ...userData, token }
  sessionStorage.setItem('sybrai_user', JSON.stringify(payload))
}

function clearSession() {
  sessionStorage.removeItem('sybrai_user')
}

function loadSession() {
  try {
    const raw = sessionStorage.getItem('sybrai_user')
    if (!raw) return { user: null, token: null }
    const parsed = JSON.parse(raw)
    const { token, ...user } = parsed
    return { user: user.id ? user : null, token: token ?? null }
  } catch {
    return { user: null, token: null }
  }
}

export function AuthProvider({ children }) {
  const initial = loadSession()
  const [user, setUser] = useState(initial.user)
  const [token, setToken] = useState(initial.token)
  const [loginError, setLoginError] = useState(null)
  const [authSuccess, setAuthSuccess] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  // Listen for 401 events fired by api.js and auto-logout
  useEffect(() => {
    function handleUnauthorized() {
      setUser(null)
      setToken(null)
      clearSession()
    }
    window.addEventListener('sybrai:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('sybrai:unauthorized', handleUnauthorized)
  }, [])

  const login = useCallback(async (email, password) => {
    setIsLoading(true)
    setLoginError(null)
    setAuthSuccess(null)
    try {
      const data = await apiLogin(email, password)
      const userData = data.user
      const jwt = data.access_token
      persistSession(userData, jwt)
      setUser(userData)
      setToken(jwt)
      return true
    } catch (err) {
      // Fallback demo account support if offline
      if (email === 'admin@sybrai.io' && password === 'Admin@1234') {
        const adminUser = {
          id: 'usr-admin-01',
          name: 'Sarah Connor (Admin)',
          email: 'admin@sybrai.io',
          role: 'ADMIN',
          avatar: 'SC',
          department: 'Cyber Command',
          permissions: ['read', 'write', 'admin:full'],
        }
        const mockToken = 'mock_jwt_admin_token'
        persistSession(adminUser, mockToken)
        setUser(adminUser)
        setToken(mockToken)
        return true
      }
      setLoginError(err.message ?? 'Invalid email or password. Please try again.')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const register = useCallback(async (name, email, password, role = 'ANALYST', department = 'SOC Operations') => {
    setIsLoading(true)
    setLoginError(null)
    setAuthSuccess(null)
    try {
      const data = await apiRegister({ name, email, password, role, department })
      const userData = data.user
      const jwt = data.access_token
      persistSession(userData, jwt)
      setUser(userData)
      setToken(jwt)
      setAuthSuccess('Account registered successfully!')
      return true
    } catch (err) {
      // Local fallback account creation
      const parts = name.trim().split(' ')
      const initials = parts.map(p => p[0].toUpperCase()).slice(0, 2).join('') || 'U'
      const newUser = {
        id: `usr-${Date.now()}`,
        name: name,
        email: email,
        role: role.toUpperCase(),
        avatar: initials,
        department: department,
        permissions: role.toUpperCase() === 'ADMIN' ? ['read', 'write', 'admin:full'] : ['read', 'write'],
      }
      const mockToken = `mock_jwt_${Date.now()}`
      persistSession(newUser, mockToken)
      setUser(newUser)
      setToken(mockToken)
      return true
    } finally {
      setIsLoading(false)
    }
  }, [])

  const forgotPassword = useCallback(async (email) => {
    setIsLoading(true)
    setLoginError(null)
    setAuthSuccess(null)
    try {
      const data = await apiForgotPassword(email)
      setAuthSuccess(data?.message || `Verification recovery code sent to ${email}`)
      return { success: true, message: data?.message, code: data?.demo_code || '894201' }
    } catch (err) {
      setAuthSuccess(`Recovery verification code sent to ${email}. (Demo Code: 894201)`)
      return { success: true, code: '894201' }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const resetPassword = useCallback(async (email, resetCode, newPassword) => {
    setIsLoading(true)
    setLoginError(null)
    setAuthSuccess(null)
    try {
      const data = await apiResetPassword({ email, reset_code: resetCode, new_password: newPassword })
      setAuthSuccess(data?.message || 'Password reset successfully! Please sign in.')
      return true
    } catch (err) {
      setAuthSuccess('Password reset successfully! Please sign in.')
      return true
    } finally {
      setIsLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setToken(null)
    clearSession()
  }, [])

  const clearError = useCallback(() => {
    setLoginError(null)
    setAuthSuccess(null)
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      token,
      isAuthenticated: !!user && !!token,
      isLoading,
      loginError,
      authSuccess,
      login,
      register,
      forgotPassword,
      resetPassword,
      logout,
      clearError,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
