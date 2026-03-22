import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function cleanAssistantContent(content: string) {
  return content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
}

function renderInlineMarkdown(text: string) {
  return text
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
}

export function renderMarkdown(content: string) {
  const safe = escapeHtml(cleanAssistantContent(content))
  if (!safe.trim()) {
    return '<p class="text-sm text-slate-500">Thinking...</p>'
  }

  const blocks = safe.split(/\n\s*\n/)
  return blocks
    .map((block) => {
      const lines = block.split('\n').map((line) => line.trimEnd())
      if (lines.every((line) => line.trim().startsWith('- '))) {
        const items = lines
          .map((line) => `<li>${renderInlineMarkdown(line.trim().slice(2))}</li>`)
          .join('')
        return `<ul>${items}</ul>`
      }
      if (lines[0]?.startsWith('### ')) {
        return `<h3>${renderInlineMarkdown(lines[0].slice(4))}</h3>`
      }
      if (lines[0]?.startsWith('## ')) {
        return `<h2>${renderInlineMarkdown(lines[0].slice(3))}</h2>`
      }
      if (lines[0]?.startsWith('# ')) {
        return `<h1>${renderInlineMarkdown(lines[0].slice(2))}</h1>`
      }
      return `<p>${renderInlineMarkdown(lines.join('<br/>'))}</p>`
    })
    .join('')
}

export type ToolResult = {
  toolCallId?: string
  toolName?: string
  args?: Record<string, unknown>
  success?: boolean
  data?: unknown
  error?: string | null
}

export function tryParseToolResults(content: string): ToolResult[] | null {
  try {
    const parsed = JSON.parse(content) as { toolResults?: ToolResult[] }
    if (Array.isArray(parsed.toolResults)) {
      return parsed.toolResults
    }
  } catch {}
  return null
}
