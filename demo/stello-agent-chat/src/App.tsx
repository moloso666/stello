import { useEffect, useMemo, useRef, useState } from 'react'
import { Bot, GitBranchPlus, RefreshCcw, Send, Sparkles } from 'lucide-react'
import { ChatMessage } from './components/chat-message'
import { SessionTree, type ViewSession } from './components/session-tree'
import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { ScrollArea } from './components/ui/scroll-area'
import { Textarea } from './components/ui/textarea'

type DemoMessage = {
  role: 'user' | 'assistant'
  content: string
}

type DemoState = {
  currentSessionId: string | null
  sessions: ViewSession[]
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options)
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error ?? 'Request failed')
  }
  return data as T
}

export default function App() {
  const [state, setState] = useState<DemoState>({ currentSessionId: null, sessions: [] })
  const [messages, setMessages] = useState<DemoMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [forking, setForking] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const currentSession = useMemo(
    () => state.sessions.find((session) => session.id === state.currentSessionId) ?? null,
    [state.currentSessionId, state.sessions],
  )

  useEffect(() => {
    void loadState()
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  async function loadState() {
    const nextState = await fetchJson<DemoState>('/api/state')
    setState(nextState)
    const nextSessionId = nextState.currentSessionId ?? nextState.sessions[0]?.id ?? null
    if (nextSessionId) {
      await openSession(nextSessionId, nextState.sessions)
    }
  }

  async function openSession(sessionId: string, sessionsOverride?: ViewSession[]) {
    await fetchJson(`/api/sessions/${sessionId}/enter`, { method: 'POST' })
    setState((prev) => ({
      currentSessionId: sessionId,
      sessions: sessionsOverride ?? prev.sessions,
    }))
    const data = await fetchJson<{ sessionId: string; messages: DemoMessage[] }>(`/api/sessions/${sessionId}/messages`)
    setMessages(data.messages)
  }

  async function streamTurn() {
    if (!state.currentSessionId || !input.trim() || loading) return

    const nextInput = input.trim()
    setInput('')
    setLoading(true)
    setMessages((prev) => [...prev, { role: 'user', content: nextInput }, { role: 'assistant', content: '' }])

    try {
      const response = await fetch(`/api/sessions/${state.currentSessionId}/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ input: nextInput }),
      })

      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => ({ error: 'Stream failed' }))
        throw new Error(payload.error ?? 'Stream failed')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let assistantBuffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim()) continue
          const payload = JSON.parse(line) as
            | { type: 'delta'; delta: string }
            | { type: 'done'; messages: DemoMessage[] }
            | { type: 'error'; error: string }

          if (payload.type === 'delta') {
            assistantBuffer += payload.delta
            setMessages((prev) => {
              const next = [...prev]
              next[next.length - 1] = { role: 'assistant', content: assistantBuffer }
              return next
            })
          }

          if (payload.type === 'done') {
            setMessages(payload.messages)
            const nextState = await fetchJson<DemoState>('/api/state')
            setState(nextState)
          }

          if (payload.type === 'error') {
            throw new Error(payload.error)
          }
        }
      }
    } finally {
      setLoading(false)
    }
  }

  async function createChildSession() {
    if (!state.currentSessionId || forking) return
    const label = window.prompt('子会话名称', 'UI Exploration')
    if (!label) return
    const scope = window.prompt('子会话 scope（可选）', 'ui') ?? ''

    setForking(true)
    try {
      await fetchJson(`/api/sessions/${state.currentSessionId}/fork`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          label,
          scope: scope.trim() || undefined,
        }),
      })
      await loadState()
    } finally {
      setForking(false)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.18),transparent_24%),radial-gradient(circle_at_top_right,rgba(196,181,253,0.18),transparent_30%),linear-gradient(180deg,#eff6ff_0%,#f8fafc_45%,#eef2ff_100%)] text-slate-900">
      <div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-[320px_minmax(0,1fr)_340px] gap-5 px-5 py-5">
        <div className="grid gap-5">
          <Card>
            <CardHeader>
              <Badge className="w-fit">Demo</Badge>
              <CardTitle className="mt-3 text-4xl font-black tracking-[-0.05em]">StelloAgent</CardTitle>
              <CardDescription className="mt-2 text-base">真实 LLM 驱动的多 Session 工作台</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-slate-500">
              当前 demo 已接通流式输出、工具调用和子 Session fork。
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-[0.18em] text-slate-500">操作台</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 pt-0">
              <Button onClick={() => void loadState()}>
                <RefreshCcw className="h-4 w-4" />
                刷新会话
              </Button>
              <Button variant="secondary" onClick={() => void createChildSession()} disabled={forking || !state.currentSessionId}>
                <GitBranchPlus className="h-4 w-4" />
                创建子会话
              </Button>
            </CardContent>
          </Card>

          <Card className="min-h-0">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm uppercase tracking-[0.18em] text-slate-500">Session 列表</CardTitle>
                <Badge variant="secondary">{state.sessions.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="max-h-[calc(100vh-370px)] pr-2">
                <div className="grid gap-3">
                  {state.sessions.map((session) => (
                    <Button
                      key={session.id}
                      variant={session.id === state.currentSessionId ? 'default' : 'secondary'}
                      className="h-auto justify-start rounded-2xl px-4 py-4 text-left"
                      onClick={() => void openSession(session.id)}
                    >
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{session.label}</div>
                        <div className="mt-1 text-xs opacity-80">
                          depth {session.depth} · turns {session.turnCount}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-5">
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-5xl font-black tracking-[-0.06em]">
                  {currentSession?.label ?? '未选择会话'}
                </CardTitle>
                <CardDescription className="mt-3 text-base">
                  sessionId: {currentSession?.id ?? 'n/a'} · depth: {currentSession?.depth ?? '-'} · scope:{' '}
                  {currentSession?.scope ?? 'none'}
                </CardDescription>
              </div>
              <Badge variant="secondary" className="mt-1">
                <Sparkles className="mr-1 h-3 w-3" />
                live
              </Badge>
            </CardHeader>
          </Card>

          <Card className="min-h-0">
            <CardContent className="h-full p-4">
              <ScrollArea className="h-[calc(100vh-300px)] pr-3" ref={scrollRef}>
                <div className="grid gap-4">
                  {messages.map((message, index) => (
                    <ChatMessage
                      key={`${index}-${message.role}`}
                      role={message.role}
                      content={message.content}
                      streaming={loading && index === messages.length - 1 && message.role === 'assistant'}
                    />
                  ))}
                  {messages.length === 0 ? (
                    <div className="grid place-items-center py-20 text-center text-slate-500">
                      <div>
                        <Bot className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                        <div className="text-lg font-medium text-slate-700">开始一段新的 Session 对话</div>
                        <div className="mt-2 text-sm">试试让模型帮你创建一个子 session，或者继续拆分一个话题。</div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <form
                className="grid gap-3"
                onSubmit={(event) => {
                  event.preventDefault()
                  void streamTurn()
                }}
              >
                <Textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="输入消息，支持让模型创建子 session。"
                  rows={4}
                />
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-500">同 Session 串行，跨 Session 并行。</div>
                  <Button type="submit" disabled={!state.currentSessionId || !input.trim() || loading}>
                    <Send className="h-4 w-4" />
                    {loading ? '生成中...' : '发送'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5">
          <Card className="min-h-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-[0.18em] text-slate-500">Topology</CardTitle>
              <CardDescription>右侧展示整个 Session 树，便于观察 fork 后的结构变化。</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ScrollArea className="max-h-[calc(100vh-120px)] pr-2">
                <SessionTree
                  sessions={state.sessions}
                  currentSessionId={state.currentSessionId}
                  onSelect={(sessionId) => void openSession(sessionId)}
                />
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
