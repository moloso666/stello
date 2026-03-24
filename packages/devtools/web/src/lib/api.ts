/** DevTools API 客户端 */

const BASE = '/api'

/** 通用 fetch 封装 */
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`API Error: ${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

/** 获取 session 树 */
export function fetchSessions() {
  return request<{ root: unknown; children: unknown[] }>('/sessions')
}

/** 获取单个 session */
export function fetchSession(id: string) {
  return request<unknown>(`/sessions/${id}`)
}

/** 发送 turn */
export function sendTurn(sessionId: string, input: string) {
  return request<unknown>(`/sessions/${sessionId}/turn`, {
    method: 'POST',
    body: JSON.stringify({ input }),
  })
}

/** Fork session */
export function forkSession(sessionId: string, label: string) {
  return request<unknown>(`/sessions/${sessionId}/fork`, {
    method: 'POST',
    body: JSON.stringify({ label }),
  })
}

/** Archive session */
export function archiveSession(sessionId: string) {
  return request<unknown>(`/sessions/${sessionId}/archive`, {
    method: 'POST',
  })
}

/** 获取 agent 配置 */
export function fetchConfig() {
  return request<{
    orchestration: { strategy: string }
    capabilities: {
      tools: Array<{ name: string; description: string }>
      skills: Array<{ name: string; description: string }>
    }
  }>('/config')
}
