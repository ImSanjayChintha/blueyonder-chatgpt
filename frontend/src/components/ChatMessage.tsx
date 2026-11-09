import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DoneIcon from '@mui/icons-material/Done'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined'
import { Box, IconButton, Stack, Tooltip, Typography, alpha } from '@mui/material'
import { useState } from 'react'
import type { Message } from '../types'
import ActionButtons from './ActionButtons'
import MarkdownContent from './MarkdownContent'

function TypingDots() {
  return (
    <Box component="span" sx={{ display: 'inline-flex', gap: 0.5, ml: 0.75, verticalAlign: 'middle' }}>
      {[0, 1, 2].map((i) => (
        <Box
          key={i}
          component="span"
          sx={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            bgcolor: 'text.secondary',
            animation: 'by-pulse-dot 1.1s ease-in-out infinite',
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </Box>
  )
}

export default function ChatMessage({
  message,
  streaming,
  showTimestamp,
  onAction,
}: {
  message: Message
  streaming?: boolean
  showTimestamp?: boolean
  onAction?: (actionId: string) => void
}) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Box
      className="by-fade-up"
      sx={{
        display: 'flex',
        justifyContent: 'center',
        px: { xs: 1.5, sm: 2.5 },
        py: 2.75,
        position: 'relative',
        bgcolor: isUser
          ? 'transparent'
          : (t) => (t.palette.mode === 'dark' ? alpha('#1db88a', 0.04) : alpha('#0b7a5f', 0.035)),
        '&:hover .msg-actions': { opacity: 1 },
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 820, display: 'flex', gap: 1.75 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '11px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            mt: 0.15,
            bgcolor: isUser ? 'primary.main' : 'background.paper',
            color: isUser ? 'primary.contrastText' : 'primary.main',
            border: isUser ? 'none' : '1px solid',
            borderColor: (t) => alpha(t.palette.primary.main, 0.35),
            boxShadow: isUser ? 'none' : (t) => `0 0 0 4px ${alpha(t.palette.primary.main, 0.06)}`,
          }}
        >
          {isUser ? (
            <PersonOutlineIcon fontSize="small" />
          ) : (
            <AutoAwesomeOutlinedIcon fontSize="small" />
          )}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.65 }}>
            <Typography
              variant="subtitle2"
              sx={{ display: 'flex', alignItems: 'center', letterSpacing: '0.01em' }}
            >
              {isUser ? 'You' : 'BlueYonder'}
              {streaming && <TypingDots />}
            </Typography>
            <Stack
              className="msg-actions"
              direction="row"
              alignItems="center"
              spacing={0.25}
              sx={{
                opacity: { xs: 1, md: streaming ? 0 : 0.35 },
                transition: 'opacity 0.2s ease',
              }}
            >
              {showTimestamp && message.createdAt && (
                <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
                  {new Date(message.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Typography>
              )}
              {!streaming && (
                <Tooltip title={copied ? 'Copied' : 'Copy message'}>
                  <IconButton size="small" onClick={copy} sx={{ color: 'text.secondary' }}>
                    {copied ? <DoneIcon fontSize="inherit" color="primary" /> : <ContentCopyIcon fontSize="inherit" />}
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          </Stack>

          {isUser ? (
            <Typography
              sx={{
                whiteSpace: 'pre-wrap',
                lineHeight: 1.7,
                fontSize: '0.98rem',
                color: 'text.primary',
              }}
            >
              {message.content}
            </Typography>
          ) : (
            <Box sx={{ position: 'relative' }}>
              <MarkdownContent content={message.content || (streaming ? '\u200b' : '')} />
              {streaming && (
                <Box
                  component="span"
                  sx={{
                    display: 'inline-block',
                    width: 7,
                    height: '1.05em',
                    ml: 0.25,
                    verticalAlign: 'text-bottom',
                    bgcolor: 'primary.main',
                    animation: 'by-cursor-blink 0.9s step-end infinite',
                  }}
                />
              )}
            </Box>
          )}

          {!streaming && message.metadata?.actions && onAction && (
            <ActionButtons actions={message.metadata.actions} onSelect={onAction} />
          )}
        </Box>
      </Box>
    </Box>
  )
}
