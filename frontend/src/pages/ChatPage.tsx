import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined'
import CodeOutlinedIcon from '@mui/icons-material/CodeOutlined'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import MenuIcon from '@mui/icons-material/Menu'
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined'
import {
  Alert,
  AppBar,
  Box,
  Button,
  Drawer,
  IconButton,
  Stack,
  Toolbar,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import * as api from '../api/client'
import ChatMessage from '../components/ChatMessage'
import MessageComposer from '../components/MessageComposer'
import SettingsDialog from '../components/SettingsDialog'
import Sidebar from '../components/Sidebar'
import { useAuth } from '../store/AuthContext'
import type { ConversationSummary, Message } from '../types'

const SUGGESTIONS: Array<{ title: string; prompt: string; icon: ReactNode; hint: string }> = [
  {
    title: 'Visualize data',
    prompt: 'Show me a chart',
    hint: 'Charts & trends',
    icon: <BarChartOutlinedIcon fontSize="small" />,
  },
  {
    title: 'Write code',
    prompt: 'Give me a code example',
    hint: 'Streaming snippet',
    icon: <CodeOutlinedIcon fontSize="small" />,
  },
  {
    title: 'Compare options',
    prompt: 'Show a comparison table',
    hint: 'Structured table',
    icon: <TableChartOutlinedIcon fontSize="small" />,
  },
  {
    title: 'Generate an image',
    prompt: 'Generate an image of a futuristic city at dusk with neon lights',
    hint: 'AI image creation',
    icon: <ImageOutlinedIcon fontSize="small" />,
  },
]

export default function ChatPage({
  themeMode,
  onToggleTheme,
}: {
  themeMode: 'light' | 'dark'
  onToggleTheme: () => void
}) {
  const { user, settings, logout, updateSettings } = useAuth()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [search, setSearch] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const loadConversations = useCallback(
    async (q = search) => {
      const list = await api.listConversations(q)
      setConversations(list)
    },
    [search],
  )

  useEffect(() => {
    loadConversations().catch(() => setError('Failed to load conversations'))
  }, [loadConversations])

  useEffect(() => {
    const timer = setTimeout(() => {
      loadConversations(search).catch(() => undefined)
    }, 250)
    return () => clearTimeout(timer)
  }, [search, loadConversations])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  const selectConversation = async (id: string) => {
    setError('')
    setActiveId(id)
    setDrawerOpen(false)
    const conversation = await api.getConversation(id)
    setMessages(conversation.messages)
  }

  const startNewChat = () => {
    setActiveId(null)
    setMessages([])
    setError('')
    setDrawerOpen(false)
  }

  const deleteConversation = async (id: string) => {
    await api.deleteConversation(id)
    if (activeId === id) startNewChat()
    await loadConversations()
  }

  const send = async (payload: { content?: string; actionId?: string }) => {
    setError('')
    setStreaming(true)

    const optimisticId = `temp-${Date.now()}`
    if (payload.content) {
      setMessages((prev) => [
        ...prev,
        {
          id: optimisticId,
          conversationId: activeId || 'pending',
          role: 'user',
          content: payload.content!,
          contentType: 'markdown',
          createdAt: new Date().toISOString(),
        },
      ])
    }

    const assistantId = `stream-${Date.now()}`
    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        conversationId: activeId || 'pending',
        role: 'assistant',
        content: '',
        contentType: 'markdown',
      },
    ])

    const controller = new AbortController()
    abortRef.current = controller

    try {
      await api.streamChat(
        {
          conversationId: activeId,
          content: payload.content,
          actionId: payload.actionId,
        },
        {
          onMeta: (meta) => {
            setActiveId(meta.conversationId)
            setMessages((prev) =>
              prev.map((m) =>
                m.id === optimisticId
                  ? { ...meta.userMessage }
                  : m.id === assistantId
                    ? { ...m, conversationId: meta.conversationId }
                    : m,
              ),
            )
          },
          onToken: (token) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + token } : m)),
            )
          },
          onRich: (metadata) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, metadata } : m)),
            )
          },
          onDone: (message) => {
            setMessages((prev) => prev.map((m) => (m.id === assistantId ? message : m)))
            loadConversations().catch(() => undefined)
          },
          onError: (message) => setError(message),
        },
        controller.signal,
      )
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') {
        setError((err as Error).message || 'Stream failed')
        setMessages((prev) => prev.filter((m) => m.id !== assistantId && m.id !== optimisticId))
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }

  const exportChat = async (format: 'markdown' | 'json') => {
    if (!activeId) return
    const data = await api.exportConversation(activeId, format)
    const blob =
      format === 'json'
        ? new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        : new Blob([data as string], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `conversation.${format === 'json' ? 'json' : 'md'}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const sidebar = (
    <Sidebar
      conversations={conversations}
      activeId={activeId}
      search={search}
      onSearch={setSearch}
      onNewChat={startNewChat}
      onSelect={(id) => {
        selectConversation(id).catch(() => setError('Failed to open conversation'))
      }}
      onDelete={(id) => {
        deleteConversation(id).catch(() => setError('Failed to delete conversation'))
      }}
      onOpenSettings={() => setSettingsOpen(true)}
      onLogout={logout}
      onToggleTheme={onToggleTheme}
      themeMode={themeMode}
      userName={user?.name}
    />
  )

  const activeTitle = conversations.find((c) => c.id === activeId)?.title || 'New chat'

  return (
    <Box sx={{ height: '100vh', display: 'flex', overflow: 'hidden', bgcolor: 'background.default' }}>
      {isMobile ? (
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} PaperProps={{ sx: { width: 300 } }}>
          {sidebar}
        </Drawer>
      ) : (
        sidebar
      )}

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AppBar
          position="static"
          color="transparent"
          elevation={0}
          sx={{
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: (t) => alpha(t.palette.background.default, 0.85),
            backdropFilter: 'blur(10px)',
          }}
        >
          <Toolbar sx={{ gap: 1, minHeight: { xs: 58, sm: 64 } }}>
            {isMobile && (
              <IconButton edge="start" onClick={() => setDrawerOpen(true)}>
                <MenuIcon />
              </IconButton>
            )}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" noWrap sx={{ fontWeight: 650 }}>
                {activeTitle}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {streaming ? 'Generating response…' : 'Streaming assistant'}
              </Typography>
            </Box>
            {activeId && (
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<DownloadOutlinedIcon />}
                  onClick={() => exportChat('markdown')}
                  sx={{ borderColor: 'divider', display: { xs: 'none', sm: 'inline-flex' } }}
                >
                  Export
                </Button>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => exportChat('json')}
                  sx={{ color: 'text.secondary' }}
                >
                  JSON
                </Button>
              </Stack>
            )}
          </Toolbar>
        </AppBar>

        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            backgroundImage: (t) =>
              t.palette.mode === 'dark'
                ? 'radial-gradient(800px 360px at 50% -10%, rgba(29,184,138,0.08), transparent 60%)'
                : 'radial-gradient(800px 360px at 50% -10%, rgba(11,122,95,0.07), transparent 60%)',
          }}
        >
          {messages.length === 0 ? (
            <Box
              sx={{
                minHeight: '100%',
                display: 'grid',
                placeItems: 'center',
                px: 2.5,
                py: 5,
              }}
            >
              <Box sx={{ width: '100%', maxWidth: 760, textAlign: 'center' }}>
                <Typography
                  className="by-fade-up"
                  variant="overline"
                  color="primary"
                  sx={{ mb: 1.5, display: 'block' }}
                >
                  BlueYonder ChatGPT
                </Typography>
                <Typography
                  className="by-fade-up by-fade-up-delay-1"
                  variant="h3"
                  sx={{ mb: 1.5, fontSize: { xs: '2rem', sm: '2.6rem' } }}
                >
                  How can I help today?
                </Typography>
                <Typography
                  className="by-fade-up by-fade-up-delay-2"
                  color="text.secondary"
                  sx={{ mb: 4, maxWidth: 520, mx: 'auto', lineHeight: 1.7 }}
                >
                  Ask for charts, tables, code, or generate AI images. Responses stream live
                  with rich markdown and follow-up actions.
                </Typography>

                <Box
                  className="by-fade-up by-fade-up-delay-3"
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: 1.5,
                    textAlign: 'left',
                  }}
                >
                  {SUGGESTIONS.map((item) => (
                    <Box
                      key={item.prompt}
                      component="button"
                      type="button"
                      disabled={streaming}
                      onClick={() => send({ content: item.prompt })}
                      sx={{
                        all: 'unset',
                        cursor: streaming ? 'default' : 'pointer',
                        p: 2,
                        borderRadius: 2.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: (t) => alpha(t.palette.background.paper, 0.85),
                        transition: 'transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease',
                        '&:hover:not(:disabled)': {
                          transform: 'translateY(-2px)',
                          borderColor: 'primary.main',
                          bgcolor: (t) => alpha(t.palette.primary.main, 0.05),
                        },
                      }}
                    >
                      <Stack direction="row" spacing={1.5} alignItems="flex-start">
                        <Box
                          sx={{
                            width: 36,
                            height: 36,
                            borderRadius: 1.5,
                            display: 'grid',
                            placeItems: 'center',
                            bgcolor: (t) => alpha(t.palette.primary.main, 0.1),
                            color: 'primary.main',
                            flexShrink: 0,
                          }}
                        >
                          {item.icon}
                        </Box>
                        <Box>
                          <Typography sx={{ fontWeight: 650, mb: 0.25 }}>{item.title}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {item.hint}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          ) : (
            messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                streaming={
                  streaming && message.role === 'assistant' && message.id.startsWith('stream-')
                }
                showTimestamp={settings?.showTimestamps}
                onAction={(actionId) => send({ actionId })}
              />
            ))
          )}
          <div ref={bottomRef} />
        </Box>

        {error && (
          <Alert severity="error" sx={{ mx: 2, mb: 1, borderRadius: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <MessageComposer
          streaming={streaming}
          onSend={(content) => send({ content })}
          onStop={() => abortRef.current?.abort()}
        />
      </Box>

      <SettingsDialog
        open={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onSave={updateSettings}
      />
    </Box>
  )
}
