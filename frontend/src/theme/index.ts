import { alpha, createTheme, type ThemeOptions } from '@mui/material/styles'

const shared: ThemeOptions = {
  typography: {
    fontFamily: '"IBM Plex Sans", "Segoe UI", sans-serif',
    h1: { fontFamily: '"Instrument Serif", Georgia, serif', fontWeight: 400, letterSpacing: '-0.02em' },
    h2: { fontFamily: '"Instrument Serif", Georgia, serif', fontWeight: 400, letterSpacing: '-0.02em' },
    h3: { fontFamily: '"Instrument Serif", Georgia, serif', fontWeight: 400 },
    h4: { fontFamily: '"Instrument Serif", Georgia, serif', fontWeight: 400, letterSpacing: '-0.01em' },
    h5: { fontWeight: 650, letterSpacing: '-0.01em' },
    h6: { fontWeight: 650, letterSpacing: '-0.01em' },
    subtitle1: { fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0 },
    overline: { letterSpacing: '0.08em', fontWeight: 600 },
  },
  shape: { borderRadius: 14 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          transition: 'background-color 0.25s ease, color 0.25s ease',
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 10,
          paddingInline: 16,
        },
        sizeLarge: {
          minHeight: 46,
          fontSize: '0.95rem',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 8,
          fontSize: 12,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 18,
        },
      },
    },
  },
}

export function createAppTheme(mode: 'light' | 'dark') {
  const isDark = mode === 'dark'
  const primary = isDark ? '#1db88a' : '#0b7a5f'
  const paper = isDark ? '#14181c' : '#ffffff'
  const background = isDark ? '#0d1114' : '#f3f6f5'

  return createTheme({
    ...shared,
    palette: {
      mode,
      primary: {
        main: primary,
        light: isDark ? '#3dcea5' : '#149572',
        dark: isDark ? '#12906c' : '#085c47',
        contrastText: '#ffffff',
      },
      secondary: {
        main: isDark ? '#8b97a5' : '#5b6775',
      },
      background: {
        default: background,
        paper,
      },
      divider: isDark ? alpha('#9eb0c0', 0.16) : alpha('#1c2b36', 0.1),
      text: {
        primary: isDark ? '#edf2f5' : '#142029',
        secondary: isDark ? '#9aabba' : '#5d6b78',
      },
      action: {
        hover: isDark ? alpha('#ffffff', 0.04) : alpha('#0b7a5f', 0.04),
        selected: isDark ? alpha('#1db88a', 0.16) : alpha('#0b7a5f', 0.1),
      },
    },
  })
}
