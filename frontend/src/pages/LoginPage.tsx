import {
  Alert,
  Box,
  Button,
  Link,
  Stack,
  TextField,
  Typography,
  alpha,
} from '@mui/material'
import { useState, type FormEvent } from 'react'
import { Link as RouterLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Login failed'
      setError(typeof message === 'string' ? message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1.05fr 0.95fr' },
      }}
    >
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 5,
          color: '#edf2f5',
          background:
            'linear-gradient(155deg, #0a3d32 0%, #0b7a5f 42%, #0f2740 100%), radial-gradient(600px 400px at 20% 20%, rgba(255,255,255,0.12), transparent)',
        }}
      >
        <Box>
          <Typography
            sx={{
              fontFamily: '"Instrument Serif", Georgia, serif',
              fontSize: '2.4rem',
              lineHeight: 1,
              mb: 1,
            }}
          >
            BlueYonder ChatGPT
          </Typography>
          <Typography sx={{ opacity: 0.85, maxWidth: 360, lineHeight: 1.7 }}>
            A polished conversational workspace with streaming replies, rich content, and
            persistent chat history.
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ opacity: 0.7 }}>
          Built for clear thinking and fast iteration.
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          placeItems: 'center',
          px: 2.5,
          py: 5,
          background: 'var(--by-surface-glow)',
          bgcolor: 'background.default',
        }}
      >
        <Box
          className="by-fade-up"
          sx={{
            width: '100%',
            maxWidth: 420,
            p: { xs: 2.5, sm: 3.5 },
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: (t) => alpha(t.palette.background.paper, 0.92),
            boxShadow: (t) =>
              t.palette.mode === 'dark'
                ? '0 20px 50px rgba(0,0,0,0.35)'
                : '0 18px 40px rgba(20,32,41,0.08)',
          }}
        >
          <Typography variant="overline" color="primary" sx={{ display: { md: 'none' }, mb: 1 }}>
            BlueYonder ChatGPT
          </Typography>
          <Typography variant="h4" sx={{ mb: 0.75, fontSize: '2rem' }}>
            Welcome back
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
            Sign in to continue your conversations.
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}
          <Stack component="form" spacing={2} onSubmit={onSubmit}>
            <TextField
              label="Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
            />
            <TextField
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
            />
            <Button type="submit" variant="contained" size="large" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </Stack>
          <Typography variant="body2" sx={{ mt: 2.5 }}>
            No account?{' '}
            <Link component={RouterLink} to="/register" underline="hover">
              Create one
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
