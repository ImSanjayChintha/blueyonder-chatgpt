import AddIcon from '@mui/icons-material/Add'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined'
import LogoutIcon from '@mui/icons-material/Logout'
import SearchIcon from '@mui/icons-material/Search'
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined'
import {
  Avatar,
  Box,
  Button,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
} from '@mui/material'
import type { ConversationSummary } from '../types'

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export default function Sidebar({
  conversations,
  activeId,
  search,
  onSearch,
  onNewChat,
  onSelect,
  onDelete,
  onOpenSettings,
  onLogout,
  onToggleTheme,
  themeMode,
  userName,
}: {
  conversations: ConversationSummary[]
  activeId: string | null
  search: string
  onSearch: (value: string) => void
  onNewChat: () => void
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onOpenSettings: () => void
  onLogout: () => void
  onToggleTheme: () => void
  themeMode: 'light' | 'dark'
  userName?: string
}) {
  const initials = (userName || 'U')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <Box
      sx={{
        width: 300,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.paper',
        borderRight: '1px solid',
        borderColor: 'divider',
        backgroundImage: (t) =>
          t.palette.mode === 'dark'
            ? 'linear-gradient(180deg, rgba(29,184,138,0.06), transparent 28%)'
            : 'linear-gradient(180deg, rgba(11,122,95,0.05), transparent 28%)',
      }}
    >
      <Box sx={{ p: 2.25, pb: 1.5 }}>
        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 2 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: '10px',
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              fontFamily: '"Instrument Serif", Georgia, serif',
              fontSize: 18,
              fontWeight: 400,
              flexShrink: 0,
            }}
          >
            B
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontFamily: '"Instrument Serif", Georgia, serif',
                fontSize: '1.2rem',
                lineHeight: 1.1,
                letterSpacing: '-0.02em',
              }}
              noWrap
            >
              BlueYonder
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: '0.04em' }}>
              CHATGPT
            </Typography>
          </Box>
        </Stack>

        <Button
          fullWidth
          variant="contained"
          startIcon={<AddIcon />}
          onClick={onNewChat}
          sx={{ mb: 1.5, justifyContent: 'flex-start', py: 1.1 }}
        >
          New chat
        </Button>

        <TextField
          size="small"
          fullWidth
          placeholder="Search conversations"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: (t) => alpha(t.palette.text.primary, 0.03),
            },
          }}
        />
      </Box>

      <Typography
        variant="overline"
        color="text.secondary"
        sx={{ px: 2.5, pt: 1, pb: 0.5, opacity: 0.8 }}
      >
        Recent
      </Typography>

      <List sx={{ flex: 1, overflowY: 'auto', px: 1.25, py: 0.5 }}>
        {conversations.length === 0 && (
          <Box sx={{ px: 1.5, py: 3, textAlign: 'center' }}>
            <ChatBubbleOutlineIcon sx={{ color: 'text.secondary', mb: 1, opacity: 0.5 }} />
            <Typography variant="body2" color="text.secondary">
              Your conversations will appear here.
            </Typography>
          </Box>
        )}
        {conversations.map((c) => {
          const selected = c.id === activeId
          return (
            <ListItemButton
              key={c.id}
              selected={selected}
              onClick={() => onSelect(c.id)}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                px: 1.25,
                py: 1.1,
                alignItems: 'flex-start',
                border: '1px solid',
                borderColor: selected ? 'primary.main' : 'transparent',
                transition: 'background-color 0.2s ease, border-color 0.2s ease',
                '& .delete-btn': { opacity: 0 },
                '&:hover .delete-btn': { opacity: 1 },
                '&.Mui-selected': {
                  bgcolor: 'action.selected',
                  '&:hover': { bgcolor: 'action.selected' },
                },
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0, pr: 0.5 }}>
                <Typography
                  noWrap
                  sx={{
                    fontSize: 13.5,
                    fontWeight: selected ? 650 : 500,
                    mb: 0.25,
                  }}
                >
                  {c.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap display="block">
                  {c.messageCount} messages · {relativeTime(c.updatedAt)}
                </Typography>
              </Box>
              <IconButton
                className="delete-btn"
                size="small"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(c.id)
                }}
                aria-label="Delete conversation"
                sx={{
                  mt: 0.25,
                  color: 'text.secondary',
                  transition: 'opacity 0.15s ease',
                  '&:hover': { color: 'error.main', bgcolor: (t) => alpha(t.palette.error.main, 0.08) },
                }}
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </ListItemButton>
          )
        })}
      </List>

      <Divider />
      <Box sx={{ p: 1.5 }}>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1.25}
          sx={{
            p: 1,
            borderRadius: 2,
            bgcolor: (t) => alpha(t.palette.text.primary, 0.03),
          }}
        >
          <Avatar
            sx={{
              width: 34,
              height: 34,
              fontSize: 13,
              fontWeight: 700,
              bgcolor: 'primary.main',
            }}
          >
            {initials}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap>
              {userName || 'User'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Signed in
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.25}>
            <Tooltip title={themeMode === 'dark' ? 'Light mode' : 'Dark mode'}>
              <IconButton size="small" onClick={onToggleTheme}>
                {themeMode === 'dark' ? <LightModeOutlinedIcon fontSize="small" /> : <DarkModeOutlinedIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Settings">
              <IconButton size="small" onClick={onOpenSettings}>
                <SettingsOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Log out">
              <IconButton size="small" onClick={onLogout}>
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </Box>
    </Box>
  )
}
