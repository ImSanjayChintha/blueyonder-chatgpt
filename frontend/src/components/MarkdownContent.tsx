import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  alpha,
  useTheme,
} from '@mui/material'
import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeHighlight from 'rehype-highlight'
import remarkGfm from 'remark-gfm'
import type { ChartSpec } from '../types'
import ChartBlock from './ChartBlock'
import GeneratedImage from './GeneratedImage'
import 'highlight.js/styles/github-dark.css'

function parseChart(code: string): ChartSpec | null {
  try {
    const parsed = JSON.parse(code) as ChartSpec
    if (!parsed?.labels || !parsed?.datasets) return null
    return parsed
  } catch {
    return null
  }
}

export default function MarkdownContent({ content }: { content: string }) {
  const theme = useTheme()

  const components = useMemo(
    () => ({
      code({ className, children, ...props }: { className?: string; children?: React.ReactNode }) {
        const match = /language-(\w+)/.exec(className || '')
        const code = String(children).replace(/\n$/, '')
        if (match?.[1] === 'chart') {
          const spec = parseChart(code)
          if (spec) return <ChartBlock spec={spec} />
        }
        const inline = !match && !String(children).includes('\n')
        if (inline) {
          return (
            <Box
              component="code"
              sx={{
                px: 0.75,
                py: 0.25,
                borderRadius: 1,
                bgcolor: theme.palette.mode === 'dark' ? '#2a2a2a' : '#eef2f1',
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: '0.85em',
              }}
              {...props}
            >
              {children}
            </Box>
          )
        }
        return (
          <Box
            component="pre"
            sx={{
              overflow: 'auto',
              p: 2,
              borderRadius: 2,
              bgcolor: theme.palette.mode === 'dark' ? '#0d1117' : '#1e1e1e',
              color: '#e6edf3',
              fontFamily: '"JetBrains Mono", monospace',
              fontSize: '0.85rem',
              my: 1.5,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <code className={className} {...props}>
              {children}
            </code>
          </Box>
        )
      },
      table({ children }: { children?: React.ReactNode }) {
        return (
          <TableContainer
            sx={{
              my: 2,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              overflowX: 'auto',
              bgcolor: (t) => alpha(t.palette.background.paper, 0.7),
            }}
          >
            <Table size="small" sx={{ minWidth: 420 }}>
              {children}
            </Table>
          </TableContainer>
        )
      },
      thead({ children }: { children?: React.ReactNode }) {
        return (
          <TableHead
            sx={{
              bgcolor: (t) =>
                t.palette.mode === 'dark' ? alpha('#1db88a', 0.1) : alpha('#0b7a5f', 0.08),
            }}
          >
            {children}
          </TableHead>
        )
      },
      tbody({ children }: { children?: React.ReactNode }) {
        return <TableBody>{children}</TableBody>
      },
      tr({ children }: { children?: React.ReactNode }) {
        return (
          <TableRow
            sx={{
              '&:nth-of-type(even)': {
                bgcolor: (t) => alpha(t.palette.text.primary, 0.02),
              },
            }}
          >
            {children}
          </TableRow>
        )
      },
      th({ children }: { children?: React.ReactNode }) {
        return (
          <TableCell
            sx={{
              fontWeight: 700,
              borderColor: 'divider',
              py: 1.25,
              whiteSpace: 'nowrap',
            }}
          >
            {children}
          </TableCell>
        )
      },
      td({ children }: { children?: React.ReactNode }) {
        return (
          <TableCell sx={{ borderColor: 'divider', py: 1.15, verticalAlign: 'top' }}>
            {children}
          </TableCell>
        )
      },
      img({ src, alt }: { src?: string; alt?: string }) {
        return <GeneratedImage src={src} alt={alt} />
      },
      ul({ children }: { children?: React.ReactNode }) {
        return (
          <Box
            component="ul"
            sx={{
              pl: 0,
              mb: 1.5,
              mt: 0.5,
              listStyle: 'none',
              '& > li': {
                position: 'relative',
                pl: 2.5,
                mb: 0.75,
                '&::before': {
                  content: '"•"',
                  position: 'absolute',
                  left: 8,
                  color: 'primary.main',
                  fontWeight: 700,
                },
              },
            }}
          >
            {children}
          </Box>
        )
      },
      ol({ children }: { children?: React.ReactNode }) {
        return (
          <Box
            component="ol"
            sx={{
              pl: 0,
              mb: 1.5,
              mt: 0.5,
              listStyle: 'none',
              counterReset: 'by-ol',
              '& > li': {
                position: 'relative',
                pl: 3.25,
                mb: 0.85,
                counterIncrement: 'by-ol',
                '&::before': {
                  content: 'counter(by-ol)',
                  position: 'absolute',
                  left: 0,
                  top: 1,
                  width: 22,
                  height: 22,
                  borderRadius: '7px',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  bgcolor: (t) => alpha(t.palette.primary.main, 0.12),
                  color: 'primary.main',
                },
              },
            }}
          >
            {children}
          </Box>
        )
      },
      li({ children }: { children?: React.ReactNode }) {
        return (
          <Typography component="li" sx={{ lineHeight: 1.7, fontSize: '0.98rem' }}>
            {children}
          </Typography>
        )
      },
      a({ href, children }: { href?: string; children?: React.ReactNode }) {
        return (
          <Box
            component="a"
            href={href}
            target="_blank"
            rel="noreferrer"
            sx={{ color: 'primary.main', textDecorationThickness: '1px' }}
          >
            {children}
          </Box>
        )
      },
    }),
    [theme],
  )

  return (
    <Box
      sx={{
        fontSize: '0.98rem',
        '& p': { m: 0, mb: 1.35, lineHeight: 1.75 },
        '& blockquote': {
          borderLeft: '3px solid',
          borderColor: 'primary.main',
          pl: 2,
          ml: 0,
          color: 'text.secondary',
          my: 1.5,
          bgcolor: (t) =>
            t.palette.mode === 'dark' ? 'rgba(29,184,138,0.06)' : 'rgba(11,122,95,0.04)',
          py: 0.75,
          borderRadius: '0 10px 10px 0',
        },
        '& h1, & h2, & h3': {
          mt: 2.25,
          mb: 1,
          fontWeight: 650,
          letterSpacing: '-0.01em',
        },
        '& hr': { borderColor: 'divider', my: 2.5 },
        '& em': { color: 'text.secondary' },
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]} components={components}>
        {content}
      </ReactMarkdown>
    </Box>
  )
}
