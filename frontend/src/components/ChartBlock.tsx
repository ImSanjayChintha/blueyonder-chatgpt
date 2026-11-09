import { Box, Typography, useTheme } from '@mui/material'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ChartSpec } from '../types'

const COLORS = ['#10a37f', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']

export default function ChartBlock({ spec }: { spec: ChartSpec }) {
  const theme = useTheme()
  const data = spec.labels.map((label, index) => {
    const point: Record<string, string | number> = { label }
    spec.datasets.forEach((ds) => {
      point[ds.label] = ds.data[index] ?? 0
    })
    return point
  })

  const common = (
    <>
      <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
      <XAxis dataKey="label" stroke={theme.palette.text.secondary} />
      <YAxis stroke={theme.palette.text.secondary} />
      <Tooltip
        contentStyle={{
          background: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 8,
        }}
      />
      <Legend />
    </>
  )

  return (
    <Box
      sx={{
        my: 2,
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.default',
      }}
    >
      {spec.title && (
        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
          {spec.title}
        </Typography>
      )}
      <Box sx={{ width: '100%', height: 260 }}>
        <ResponsiveContainer>
          {spec.type === 'line' ? (
            <LineChart data={data}>
              {common}
              {spec.datasets.map((ds, i) => (
                <Line
                  key={ds.label}
                  type="monotone"
                  dataKey={ds.label}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          ) : spec.type === 'area' ? (
            <AreaChart data={data}>
              {common}
              {spec.datasets.map((ds, i) => (
                <Area
                  key={ds.label}
                  type="monotone"
                  dataKey={ds.label}
                  stroke={COLORS[i % COLORS.length]}
                  fill={COLORS[i % COLORS.length]}
                  fillOpacity={0.25}
                />
              ))}
            </AreaChart>
          ) : (
            <BarChart data={data}>
              {common}
              {spec.datasets.map((ds, i) => (
                <Bar key={ds.label} dataKey={ds.label} fill={COLORS[i % COLORS.length]} radius={4} />
              ))}
            </BarChart>
          )}
        </ResponsiveContainer>
      </Box>
    </Box>
  )
}
