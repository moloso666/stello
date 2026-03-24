/** DevTools API 客户端 */

const BASE = '/api'

/** 拓扑节点 */
export interface SessionNode {
  id: string
  label: string
  parentId: string | null
  status: 'active' | 'archived'
  turns: number
  children: string[]
  refs: string[]
}

/** Agent 配置 */
export interface AgentConfig {
  orchestration: { strategy: string }
  capabilities: {
    tools: Array<{ name: string; description: string; parameters: Record<string, unknown> }>
    skills: Array<{ name: string; description: string }>
  }
}

/** 通用 fetch 封装 */
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`API Error: ${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

/** 获取 session 树（扁平列表） */
export function fetchSessions() {
  return request<{ root: SessionNode; children: SessionNode[] }>('/sessions')
}

/** 获取单个 session */
export function fetchSession(id: string) {
  return request<SessionNode>(`/sessions/${id}`)
}

/** 发送 turn */
export function sendTurn(sessionId: string, input: string) {
  return request<{ response: string }>(`/sessions/${sessionId}/turn`, {
    method: 'POST',
    body: JSON.stringify({ input }),
  })
}

/** Fork session */
export function forkSession(sessionId: string, label: string) {
  return request<SessionNode>(`/sessions/${sessionId}/fork`, {
    method: 'POST',
    body: JSON.stringify({ label }),
  })
}

/** Archive session */
export function archiveSession(sessionId: string) {
  return request<{ ok: boolean }>(`/sessions/${sessionId}/archive`, {
    method: 'POST',
  })
}

/** L3 对话记录 */
export interface TurnRecord {
  role: string
  content: string
  timestamp?: string
}

/** Session 详细数据 */
export interface SessionDetail {
  node: SessionNode
  records: TurnRecord[]
  l2: string | null
  scope: string | null
}

/** 获取 session 详细数据 */
export function fetchSessionDetail(id: string) {
  return request<SessionDetail>(`/sessions/${id}/detail`)
}

/** 获取 agent 配置 */
export function fetchConfig() {
  return request<AgentConfig>('/config')
}

/** 更新 agent 配置 */
export function patchConfig(updates: Record<string, unknown>) {
  return request<{ ok: boolean; applied: string[] }>('/config', {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
}
