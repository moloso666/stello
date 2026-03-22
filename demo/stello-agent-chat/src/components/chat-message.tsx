import { Bot, Wrench, User } from 'lucide-react'
import { Badge } from './ui/badge'
import { Card } from './ui/card'
import { renderMarkdown, tryParseToolResults, type ToolResult } from '../lib/utils'

type Props = {
  role: 'user' | 'assistant'
  content: string
  streaming?: boolean
}

function ToolCallCard({ tool }: { tool: ToolResult }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Tool</Badge>
          <div className="font-medium text-slate-900">{tool.toolName ?? 'unknown_tool'}</div>
        </div>
        <Badge variant={tool.success ? 'success' : 'destructive'}>
          {tool.success ? 'Success' : 'Error'}
        </Badge>
      </div>
      <div className="grid gap-3 text-sm">
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Args</div>
          <pre className="overflow-auto rounded-xl bg-slate-950 px-3 py-2 text-xs text-slate-100">
            {JSON.stringify(tool.args ?? {}, null, 2)}
          </pre>
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Result</div>
          <pre className="overflow-auto rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-700">
            {JSON.stringify(tool.data ?? null, null, 2)}
          </pre>
        </div>
        {tool.error ? <div className="text-sm text-rose-600">{tool.error}</div> : null}
      </div>
    </div>
  )
}

export function ChatMessage({ role, content, streaming }: Props) {
  const toolResults = tryParseToolResults(content)
  const isUser = role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <Card
        className={[
          'max-w-[min(920px,90%)] rounded-[28px] border px-5 py-4',
          isUser
            ? 'border-slate-900 bg-slate-900 text-white shadow-[0_26px_60px_-30px_rgba(15,23,42,1)]'
            : 'border-white/80 bg-white/95',
          toolResults ? 'w-full max-w-[920px]' : '',
          streaming ? 'ring-2 ring-sky-200' : '',
        ].join(' ')}
      >
        <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          {toolResults ? <Wrench className="h-3.5 w-3.5" /> : isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
          <span className={isUser ? 'text-slate-300' : ''}>{toolResults ? 'Tool Call' : role}</span>
          {streaming ? <span className="ml-1 inline-block h-2 w-2 animate-pulse rounded-full bg-sky-400" /> : null}
        </div>

        {toolResults ? (
          <div className="grid gap-3">
            {toolResults.map((tool, index) => (
              <ToolCallCard key={`${tool.toolCallId ?? tool.toolName ?? 'tool'}-${index}`} tool={tool} />
            ))}
          </div>
        ) : isUser ? (
          <div className="whitespace-pre-wrap text-[15px] leading-7">{content}</div>
        ) : (
          <div
            className="markdown text-[15px] leading-7 text-slate-700"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
          />
        )}
      </Card>
    </div>
  )
}
