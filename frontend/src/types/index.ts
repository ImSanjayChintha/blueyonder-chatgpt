export interface User {
  id: string
  email: string
  name: string
  createdAt?: string
  settings?: UserSettings
}

export interface UserSettings {
  id?: string
  theme: 'light' | 'dark' | 'system'
  modelPreference: string
  systemPrompt: string
  streamResponses: boolean
  showTimestamps: boolean
  name?: string
  email?: string
}

export interface MessageAction {
  id: string
  label: string
}

export interface Message {
  id: string
  conversationId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  contentType: string
  metadata?: {
    actions?: MessageAction[]
    [key: string]: unknown
  } | null
  createdAt?: string
}

export interface ConversationSummary {
  id: string
  title: string
  archived: boolean
  createdAt: string
  updatedAt: string
  messageCount: number
}

export interface Conversation extends ConversationSummary {
  messages: Message[]
}

export interface ChartSpec {
  type: 'bar' | 'line' | 'area'
  title?: string
  labels: string[]
  datasets: Array<{ label: string; data: number[] }>
}
