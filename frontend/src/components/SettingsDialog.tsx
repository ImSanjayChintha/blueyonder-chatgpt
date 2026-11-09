import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { useEffect, useState } from 'react'
import type { UserSettings } from '../types'

export default function SettingsDialog({
  open,
  settings,
  onClose,
  onSave,
}: {
  open: boolean
  settings: UserSettings | null
  onClose: () => void
  onSave: (payload: Partial<UserSettings>) => Promise<void>
}) {
  const [form, setForm] = useState<Partial<UserSettings>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (settings) setForm({ ...settings })
  }, [settings, open])

  const save = async () => {
    setSaving(true)
    try {
      await onSave({
        name: form.name,
        theme: form.theme,
        modelPreference: form.modelPreference,
        systemPrompt: form.systemPrompt,
        streamResponses: form.streamResponses,
        showTimestamps: form.showTimestamps,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 0.5 }}>
        Settings
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 400 }}>
          Personalize your BlueYonder experience
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.25} sx={{ mt: 2 }}>
          <TextField
            label="Display name"
            value={form.name || ''}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            fullWidth
          />
          <TextField
            select
            label="Theme"
            value={form.theme || 'system'}
            onChange={(e) =>
              setForm((f) => ({ ...f, theme: e.target.value as UserSettings['theme'] }))
            }
            fullWidth
          >
            <MenuItem value="system">System</MenuItem>
            <MenuItem value="light">Light</MenuItem>
            <MenuItem value="dark">Dark</MenuItem>
          </TextField>
          <TextField
            label="Model preference"
            value={form.modelPreference || ''}
            onChange={(e) => setForm((f) => ({ ...f, modelPreference: e.target.value }))}
            fullWidth
            helperText="Used when OPENAI_API_KEY is configured"
          />
          <TextField
            label="System prompt"
            value={form.systemPrompt || ''}
            onChange={(e) => setForm((f) => ({ ...f, systemPrompt: e.target.value }))}
            fullWidth
            multiline
            minRows={3}
          />
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(form.streamResponses)}
                onChange={(e) => setForm((f) => ({ ...f, streamResponses: e.target.checked }))}
              />
            }
            label="Stream responses"
          />
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(form.showTimestamps)}
                onChange={(e) => setForm((f) => ({ ...f, showTimestamps: e.target.checked }))}
              />
            }
            label="Show message timestamps"
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={saving}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  )
}
