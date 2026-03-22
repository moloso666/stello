import type { ReactNode } from 'react'
import { ChevronRight, Network } from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'

export type ViewSession = {
  id: string
  label: string
  parentId: string | null
  scope?: string | null
  depth: number
  status: string
  turnCount: number
  children: string[]
}

function groupByParent(sessions: ViewSession[]) {
  const byParent = new Map<string, ViewSession[]>()
  for (const session of sessions) {
    const key = session.parentId ?? 'root'
    const group = byParent.get(key) ?? []
    group.push(session)
    byParent.set(key, group)
  }
  for (const group of byParent.values()) {
    group.sort((a, b) => a.label.localeCompare(b.label))
  }
  return byParent
}

export function SessionTree({
  sessions,
  currentSessionId,
  onSelect,
}: {
  sessions: ViewSession[]
  currentSessionId: string | null
  onSelect: (sessionId: string) => void
}) {
  const byParent = groupByParent(sessions)

  function renderNode(parentId: string | null, depth = 0): ReactNode {
    const nodes = byParent.get(parentId ?? 'root') ?? []
    if (nodes.length === 0) return null

    return (
      <div className="grid gap-2">
        {nodes.map((session) => (
          <div key={session.id} className="grid gap-2">
            <Button
              variant={session.id === currentSessionId ? 'default' : 'secondary'}
              className="h-auto justify-between rounded-2xl px-4 py-3 text-left"
              onClick={() => onSelect(session.id)}
            >
              <div className="min-w-0">
                <div className="truncate font-semibold">{session.label}</div>
                <div className="mt-1 flex items-center gap-2 text-xs opacity-80">
                  <span>d{session.depth}</span>
                  <span>{session.turnCount} turns</span>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0" />
            </Button>
            {session.children.length > 0 ? (
              <div
                className="border-l border-dashed border-slate-200 pl-4"
                style={{ marginLeft: Math.max(depth, 0) * 4 }}
              >
                {renderNode(session.id, depth + 1)}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    )
  }

  const rootCount = sessions.filter((session) => session.parentId === null).length

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Network className="h-4 w-4 text-sky-600" />
          <span className="text-sm font-semibold text-slate-900">Session 树</span>
        </div>
        <Badge variant="secondary">{rootCount} roots</Badge>
      </div>
      {renderNode(null)}
    </div>
  )
}
