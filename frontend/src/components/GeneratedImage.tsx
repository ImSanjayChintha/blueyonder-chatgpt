import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import OpenInFullIcon from '@mui/icons-material/OpenInFull'
import {
  Box,
  Dialog,
  IconButton,
  Stack,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material'
import { useMemo, useState } from 'react'

function resolveSrc(src?: string) {
  if (!src) return ''
  if (src.startsWith('http') || src.startsWith('data:') || src.startsWith('blob:')) return src
  const base = import.meta.env.VITE_API_URL || ''
  return `${base}${src}`
}

export default function GeneratedImage({ src, alt }: { src?: string; alt?: string }) {
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)
  const resolved = useMemo(() => resolveSrc(src), [src])

  const download = async () => {
    if (!resolved) return
    try {
      const response = await fetch(resolved)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = (alt || 'generated-image').replace(/\s+/g, '-').toLowerCase() + '.png'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      window.open(resolved, '_blank', 'noopener,noreferrer')
    }
  }

  if (!resolved || failed) {
    return (
      <Box
        sx={{
          my: 1.5,
          p: 2,
          borderRadius: 2,
          border: '1px dashed',
          borderColor: 'divider',
          color: 'text.secondary',
        }}
      >
        Image unavailable{alt ? ` — ${alt}` : ''}
      </Box>
    )
  }

  return (
    <>
      <Box
        sx={{
          my: 1.75,
          borderRadius: 2.5,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: (t) => alpha(t.palette.text.primary, 0.02),
          maxWidth: 640,
        }}
      >
        <Box sx={{ position: 'relative', bgcolor: 'action.hover', minHeight: loaded ? 0 : 220 }}>
          {!loaded && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                display: 'grid',
                placeItems: 'center',
                color: 'text.secondary',
                fontSize: 13,
              }}
            >
              Loading image…
            </Box>
          )}
          <Box
            component="img"
            src={resolved}
            alt={alt || 'Generated image'}
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            sx={{
              display: 'block',
              width: '100%',
              maxHeight: 520,
              objectFit: 'cover',
              opacity: loaded ? 1 : 0,
              transition: 'opacity 0.25s ease',
              cursor: 'zoom-in',
            }}
            onClick={() => setOpen(true)}
          />
          <Stack
            direction="row"
            spacing={0.5}
            sx={{
              position: 'absolute',
              top: 10,
              right: 10,
              bgcolor: (t) => alpha(t.palette.background.paper, 0.85),
              borderRadius: 1.5,
              p: 0.25,
              backdropFilter: 'blur(8px)',
            }}
          >
            <Tooltip title="Expand">
              <IconButton size="small" onClick={() => setOpen(true)}>
                <OpenInFullIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Download">
              <IconButton size="small" onClick={download}>
                <DownloadOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
        {alt && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: 'block', px: 1.5, py: 1, lineHeight: 1.5 }}
          >
            {alt}
          </Typography>
        )}
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <Box sx={{ position: 'relative', bgcolor: '#0b0f12' }}>
          <Box
            component="img"
            src={resolved}
            alt={alt || 'Generated image'}
            sx={{ display: 'block', width: '100%', maxHeight: '85vh', objectFit: 'contain' }}
          />
        </Box>
      </Dialog>
    </>
  )
}
