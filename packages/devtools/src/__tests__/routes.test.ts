import { describe, it, expect, vi } from 'vitest'
import { Hono } from 'hono'
import { createRoutes } from '../server/routes.js'

/** 构建 mock agent */
function createMockAgent() {
  return {
    sessions: {
      getRoot: vi.fn().mockResolvedValue({ id: 'root', parentId: null, label: 'Main' }),
      getChildren: vi.fn().mockResolvedValue([
        { id: 'sess-1', parentId: 'root', label: 'research' },
      ]),
      get: vi.fn().mockResolvedValue({ id: 'sess-1', parentId: 'root', label: 'research' }),
    },
    config: {
      orchestration: { strategy: { constructor: { name: 'MainSessionFlatStrategy' } } },
      capabilities: {
        tools: { getToolDefinitions: () => [{ name: 'search', description: 'Search papers', parameters: {} }] },
        skills: { getAll: () => [{ name: 'research', description: 'Research skill' }] },
      },
    },
    turn: vi.fn().mockResolvedValue({ response: 'hello' }),
    forkSession: vi.fn().mockResolvedValue({ id: 'child-1', parentId: 'sess-1', label: 'fork' }),
    archiveSession: vi.fn().mockResolvedValue(undefined),
  }
}

describe('devtools REST routes', () => {
  it('GET /sessions 返回 session 树', async () => {
    const agent = createMockAgent()
    const app = new Hono()
    app.route('/api', createRoutes(agent as never))

    const res = await app.request('/api/sessions')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('root')
    expect(body.root.id).toBe('root')
    expect(body.children).toHaveLength(1)
  })

  it('GET /sessions/:id 返回单个 session', async () => {
    const agent = createMockAgent()
    const app = new Hono()
    app.route('/api', createRoutes(agent as never))

    const res = await app.request('/api/sessions/sess-1')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe('sess-1')
    expect(agent.sessions.get).toHaveBeenCalledWith('sess-1')
  })

  it('POST /sessions/:id/turn 调用 agent.turn', async () => {
    const agent = createMockAgent()
    const app = new Hono()
    app.route('/api', createRoutes(agent as never))

    const res = await app.request('/api/sessions/sess-1/turn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'hello' }),
    })
    expect(res.status).toBe(200)
    expect(agent.turn).toHaveBeenCalledWith('sess-1', 'hello')
  })

  it('POST /sessions/:id/fork 调用 agent.forkSession', async () => {
    const agent = createMockAgent()
    const app = new Hono()
    app.route('/api', createRoutes(agent as never))

    const res = await app.request('/api/sessions/sess-1/fork', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: 'new-fork' }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe('child-1')
    expect(agent.forkSession).toHaveBeenCalledWith('sess-1', { label: 'new-fork' })
  })

  it('POST /sessions/:id/archive 调用 agent.archiveSession', async () => {
    const agent = createMockAgent()
    const app = new Hono()
    app.route('/api', createRoutes(agent as never))

    const res = await app.request('/api/sessions/sess-1/archive', { method: 'POST' })
    expect(res.status).toBe(200)
    expect(agent.archiveSession).toHaveBeenCalledWith('sess-1')
  })

  it('GET /config 返回 agent 配置', async () => {
    const agent = createMockAgent()
    const app = new Hono()
    app.route('/api', createRoutes(agent as never))

    const res = await app.request('/api/config')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.orchestration.strategy).toBe('MainSessionFlatStrategy')
    expect(body.capabilities.tools).toHaveLength(1)
    expect(body.capabilities.skills).toHaveLength(1)
  })
})
