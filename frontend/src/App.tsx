import { CircularProgress, CssBaseline, ThemeProvider } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import ChatPage from './pages/ChatPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import { AuthProvider, useAuth } from './store/AuthContext'
import { createAppTheme } from './theme'

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return children
}

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </div>
    )
  }
  if (user) return <Navigate to="/" replace />
  return children
}

function ThemedApp() {
  const { settings, updateSettings } = useAuth()
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const preferred =
    settings?.theme === 'system' || !settings?.theme
      ? systemDark
        ? 'dark'
        : 'light'
      : settings.theme

  const [mode, setMode] = useState<'light' | 'dark'>(preferred)

  useEffect(() => {
    setMode(preferred)
  }, [preferred])

  const theme = useMemo(() => createAppTheme(mode), [mode])

  const toggleTheme = () => {
    const next = mode === 'dark' ? 'light' : 'dark'
    setMode(next)
    updateSettings({ theme: next }).catch(() => undefined)
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnly>
              <LoginPage />
            </PublicOnly>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnly>
              <RegisterPage />
            </PublicOnly>
          }
        />
        <Route
          path="/"
          element={
            <Protected>
              <ChatPage themeMode={mode} onToggleTheme={toggleTheme} />
            </Protected>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <ThemedApp />
    </AuthProvider>
  )
}
