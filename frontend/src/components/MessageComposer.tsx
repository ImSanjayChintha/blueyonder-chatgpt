import SendRoundedIcon from '@mui/icons-material/SendRounded'
import StopRoundedIcon from '@mui/icons-material/StopRounded'
import { Box, IconButton, TextField, Typography, alpha } from '@mui/material'
import { useState, type FormEvent, type KeyboardEvent } from 'react'

export default function MessageComposer({
  disabled,
  streaming,
  onSend,
  onStop,
}: {
  disabled?: boolean
  streaming?: boolean
  onSend: (content: string) => void
  onStop?: () => void
}) {
  const [value, setValue] = useState('')
  const [focused, setFocused] = useState(false)

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || disabled || streaming) return
    onSend(trimmed)
    setValue('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <Box
      sx={{
        px: { xs: 1.5, sm: 2.5 },
        pb: 2.5,
        pt: 1,
        background: (t) =>
          `linear-gradient(180deg, transparent, ${alpha(t.palette.background.default, 0.92)} 28%, ${t.palette.background.default})`,
      }}
    >
      <Box
        component="form"
        onSubmit={submit}
        sx={{
          maxWidth: 820,
          mx: 'auto',
          display: 'flex',
          alignItems: 'flex-end',
          gap: 1,
          p: 1.15,
          borderRadius: 3,
          border: '1px solid',
          borderColor: focused ? 'primary.main' : 'divider',
          bgcolor: 'background.paper',
          boxShadow: (t) =>
            focused
              ? `0 0 0 4px ${alpha(t.palette.primary.main, 0.12)}`
              : t.palette.mode === 'dark'
                ? '0 10px 30px rgba(0,0,0,0.25)'
                : '0 10px 28px rgba(20,32,41,0.06)',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        }}
      >
        <TextField
          fullWidth
          multiline
          maxRows={6}
          placeholder="Ask BlueYonder anything…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          variant="standard"
          InputProps={{ disableUnderline: true }}
          sx={{
            px: 1.1,
            py: 0.65,
            '& .MuiInputBase-input': {
              fontSize: '0.98rem',
              lineHeight: 1.55,
            },
          }}
        />
        {streaming ? (
          <IconButton
            onClick={onStop}
            aria-label="Stop generating"
            sx={{
              bgcolor: (t) => alpha(t.palette.error.main, 0.1),
              color: 'error.main',
              '&:hover': { bgcolor: (t) => alpha(t.palette.error.main, 0.18) },
            }}
          >
            <StopRoundedIcon />
          </IconButton>
        ) : (
          <IconButton
            type="submit"
            disabled={!value.trim() || disabled}
            aria-label="Send message"
            sx={{
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              width: 42,
              height: 42,
              '&:hover': { bgcolor: 'primary.dark' },
              '&.Mui-disabled': {
                bgcolor: (t) => alpha(t.palette.text.primary, 0.08),
                color: 'text.disabled',
              },
            }}
          >
            <SendRoundedIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', textAlign: 'center', mt: 1.1, opacity: 0.8 }}
      >
        Enter to send · Shift + Enter for a new line
      </Typography>
    </Box>
  )
}
