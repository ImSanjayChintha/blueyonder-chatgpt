import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import * as api from '../api/client'
import type { User, UserSettings } from '../types'

interface AuthContextValue {
  user: User | null
  settings: UserSettings | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  refreshSettings: () => Promise<void>
  updateSettings: (payload: Partial<UserSettings>) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const defaultSettings: UserSettings = {
  theme: 'system',
  modelPreference: 'gpt-4o-mini',
  systemPrompt: 'You are a helpful assistant.',
  streamResponses: true,
  showTimestamps: true,
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }
    api
      .fetchMe()
      .then((me) => {
        setUser(me)
        setSettings(me.settings || defaultSettings)
      })
      .catch(() => {
        localStorage.removeItem('token')
      })
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.login(email, password)
    localStorage.setItem('token', data.token)
    setUser(data.user)
    const s = await api.getSettings()
    setSettings(s)
  }, [])

  const register = useCallback(async (name: string, email: string, password: string) => {
    const data = await api.register(name, email, password)
    localStorage.setItem('token', data.token)
    setUser(data.user)
    const s = await api.getSettings()
    setSettings(s)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    setUser(null)
    setSettings(null)
  }, [])

  const refreshSettings = useCallback(async () => {
    const s = await api.getSettings()
    setSettings(s)
  }, [])

  const updateSettings = useCallback(async (payload: Partial<UserSettings>) => {
    const s = await api.updateSettings(payload)
    setSettings(s)
    setUser((prev) => (prev ? { ...prev, name: s.name || prev.name } : prev))
  }, [])

  const value = useMemo(
    () => ({
      user,
      settings,
      loading,
      login,
      register,
      logout,
      refreshSettings,
      updateSettings,
    }),
    [user, settings, loading, login, register, logout, refreshSettings, updateSettings],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
