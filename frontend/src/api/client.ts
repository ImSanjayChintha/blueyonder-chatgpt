import axios from 'axios'
import type { Conversation, ConversationSummary, Message, User, UserSettings } from '../types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export async function register(name: string, email: string, password: string) {
  const { data } = await api.post<{ user: User; token: string }>('/api/auth/register', {
    name,
    email,
    password,
  })
  return data
}

export async function login(email: string, password: string) {
  const { data } = await api.post<{ user: User; token: string }>('/api/auth/login', {
    email,
    password,
  })
  return data
}

export async function fetchMe() {
  const { data } = await api.get<{ user: User }>('/api/auth/me')
  return data.user
}

export async function listConversations(q = '', archived = false) {
  const { data } = await api.get<{ conversations: ConversationSummary[] }>('/api/conversations/', {
    params: { q: q || undefined, archived },
  })
  return data.conversations
}

export async function getConversation(id: string) {
  const { data } = await api.get<{ conversation: Conversation }>(`/api/conversations/${id}`)
  return data.conversation
}

export async function createConversation(title?: string) {
  const { data } = await api.post<{ conversation: ConversationSummary }>('/api/conversations/', {
    title,
  })
  return data.conversation
}

export async function updateConversation(
  id: string,
  payload: { title?: string; archived?: boolean },
) {
  const { data } = await api.patch<{ conversation: ConversationSummary }>(
    `/api/conversations/${id}`,
    payload,
  )
  return data.conversation
}

export async function deleteConversation(id: string) {
  await api.delete(`/api/conversations/${id}`)
}

export async function getSettings() {
  const { data } = await api.get<{ settings: UserSettings }>('/api/settings/')
  return data.settings
}

export async function updateSettings(payload: Partial<UserSettings>) {
  const { data } = await api.patch<{ settings: UserSettings }>('/api/settings/', payload)
  return data.settings
}

export async function exportConversation(id: string, format: 'markdown' | 'json' = 'markdown') {
  const response = await api.get(`/api/conversations/${id}/export`, {
    params: { format },
    responseType: format === 'json' ? 'json' : 'text',
  })
  return response.data
}

export type StreamHandlers = {
  onMeta?: (meta: {
    conversationId: string
    conversationTitle: string
    userMessage: Message
  }) => void
  onToken?: (content: string) => void
  onRich?: (metadata: Message['metadata']) => void
  onDone?: (message: Message) => void
  onError?: (message: string) => void
}

export async function streamChat(
  payload: { conversationId?: string | null; content?: string; actionId?: string },
  handlers: StreamHandlers,
  signal?: AbortSignal,
) {
  const token = localStorage.getItem('token')
  const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
    signal,
  })

  if (!response.ok || !response.body) {
    const text = await response.text()
    throw new Error(text || 'Failed to start stream')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let eventName = 'message'

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n')
    buffer = parts.pop() || ''

    for (const line of parts) {
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim()
      } else if (line.startsWith('data:')) {
        const raw = line.slice(5).trim()
        if (!raw) continue
        try {
          const data = JSON.parse(raw)
          if (eventName === 'meta') handlers.onMeta?.(data)
          else if (eventName === 'token') handlers.onToken?.(data.content)
          else if (eventName === 'rich') handlers.onRich?.(data.metadata)
          else if (eventName === 'done') handlers.onDone?.(data.message)
          else if (eventName === 'error') handlers.onError?.(data.message)
        } catch {
          /* ignore malformed chunk */
        }
      }
    }
  }
}

export default api
