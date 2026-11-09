import NorthEastIcon from '@mui/icons-material/NorthEast'
import { Button, Stack, alpha } from '@mui/material'
import type { MessageAction } from '../types'

export default function ActionButtons({
  actions,
  disabled,
  onSelect,
}: {
  actions: MessageAction[]
  disabled?: boolean
  onSelect: (actionId: string) => void
}) {
  if (!actions.length) return null
  return (
    <Stack direction="row" flexWrap="wrap" useFlexGap gap={1} sx={{ mt: 1.75 }}>
      {actions.map((action) => (
        <Button
          key={action.id}
          size="small"
          variant="outlined"
          disabled={disabled}
          endIcon={<NorthEastIcon sx={{ fontSize: 14 }} />}
          onClick={() => onSelect(action.id)}
          sx={{
            borderColor: 'divider',
            color: 'text.primary',
            bgcolor: (t) => alpha(t.palette.background.paper, 0.7),
            px: 1.4,
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: (t) => alpha(t.palette.primary.main, 0.06),
              color: 'primary.main',
            },
          }}
        >
          {action.label}
        </Button>
      ))}
    </Stack>
  )
}
