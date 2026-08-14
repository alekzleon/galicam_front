/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react"
import {
  loginRequest,
  logoutRequest,
  meRequest,
  registerRequest,
  updateMeLocaleRequest,
} from "../services/api/authService"
import {
  clearAuthSession,
  getAuthToken,
  getAuthUser,
  hasAuthSession,
  setAuthSession,
} from "../services/storage/authStorage"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getAuthToken())
  const [user, setUser] = useState(getAuthUser())
  const [isAuthenticated, setIsAuthenticated] = useState(hasAuthSession())
  const [sessionReady, setSessionReady] = useState(false)

  const login = async ({ login, password, device_name = "react-web" }) => {
    const response = await loginRequest({
      login,
      password,
      device_name,
    })

    const nextUser = normalizeAuthUser(response)

    setAuthSession(response.token, nextUser)
    setToken(response.token)
    setUser(nextUser)
    setIsAuthenticated(true)
    setSessionReady(true)
    syncUserPreferredLocale(nextUser)

    return response
  }

  const register = async (payload) => {
    const response = await registerRequest({
      ...payload,
      device_name: payload.device_name || "react-web",
    })

    const nextUser = normalizeAuthUser(response)

    setAuthSession(response.token, nextUser)
    setToken(response.token)
    setUser(nextUser)
    setIsAuthenticated(true)
    setSessionReady(true)
    syncUserPreferredLocale(nextUser)

    return response
  }

  const refreshMe = async () => {
    const currentToken = getAuthToken()

    if (!currentToken) {
      clearAuthSession()
      setToken(null)
      setUser(null)
      setIsAuthenticated(false)
      setSessionReady(true)
      return null
    }

    try {
      const response = await meRequest(currentToken)

      const nextUser = normalizeAuthUser(response)

      setAuthSession(currentToken, nextUser)
      setToken(currentToken)
      setUser(nextUser)
      setIsAuthenticated(true)
      setSessionReady(true)
      syncUserPreferredLocale(nextUser)

      return response
    } catch {
      clearAuthSession()
      setToken(null)
      setUser(null)
      setIsAuthenticated(false)
      setSessionReady(true)
      return null
    }
  }

  const logout = async () => {
    try {
      const currentToken = getAuthToken()

      if (currentToken) {
        await logoutRequest(currentToken)
      }
    } catch (error) {
      console.error("Error al cerrar sesión en API:", error)
    } finally {
      clearAuthSession()
      setToken(null)
      setUser(null)
      setIsAuthenticated(false)
      setSessionReady(true)
    }
  }

  const updatePreferredLocale = async (locale) => {
    if (!token || !locale) return null

    const response = await updateMeLocaleRequest(locale)
    const preferredLocale = response?.data?.preferred_locale || locale
    const nextUser = user ? { ...user, preferred_locale: preferredLocale } : user

    if (nextUser) {
      setAuthSession(token, nextUser)
      setUser(nextUser)
    }

    return response
  }

  useEffect(() => {
    refreshMe()
  }, [])

  const value = useMemo(() => {
    const modules = user?.modules || []
    const isInternal = Boolean(user?.is_internal ?? (user?.role?.name !== "cliente" && user?.role))

    return {
      token,
      user,
      modules,
      isAuthenticated,
      isInternal,
      sessionReady,
      login,
      register,
      logout,
      refreshMe,
      updatePreferredLocale,
    }
  }, [token, user, isAuthenticated, sessionReady])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

function syncUserPreferredLocale(user) {
  const preferredLocale = user?.preferred_locale

  if (!preferredLocale || typeof window === "undefined") return

  window.dispatchEvent(new CustomEvent("auth:preferred-locale", { detail: preferredLocale }))
}

function normalizeAuthUser(response = {}) {
  const responseUser = response.user || response.data || null

  if (!responseUser) return null

  return {
    ...responseUser,
    is_internal: responseUser.is_internal ?? response.is_internal,
    can_manage_access: responseUser.can_manage_access ?? response.can_manage_access,
    modules: responseUser.modules || response.modules || [],
  }
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider")
  }

  return context
}
