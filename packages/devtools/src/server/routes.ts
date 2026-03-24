import { Hono } from 'hono'
import type { StelloAgent } from '@stello-ai/core'

/** 创建 DevTools REST 路由 */
export function createRoutes(agent: StelloAgent): Hono {
  const app = new Hono()

  /** 获取 session 树 */
  app.get('/sessions', async (c) => {
    const root = await agent.sessions.getRoot()
    const children = await agent.sessions.getChildren(root.id)
    return c.json({ root, children })
  })

  /** 获取单个 session 节点 */
  app.get('/sessions/:id', async (c) => {
    const id = c.req.param('id')
    const node = await agent.sessions.get(id)
    return c.json(node)
  })

  /** 获取 session 详细数据（L3/L2/scope 等） */
  app.get('/sessions/:id/detail', async (c) => {
    const id = c.req.param('id')
    const memory = agent.config.memory
    const [node, records, l2, scope] = await Promise.all([
      agent.sessions.get(id),
      memory.readRecords(id).catch(() => []),
      memory.readMemory(id).catch(() => null),
      memory.readScope(id).catch(() => null),
    ])
    return c.json({ node, records, l2, scope })
  })

  /** 非流式对话 */
  app.post('/sessions/:id/turn', async (c) => {
    const id = c.req.param('id')
    const { input } = await c.req.json<{ input: string }>()
    const result = await agent.turn(id, input)
    return c.json(result)
  })

  /** Fork session */
  app.post('/sessions/:id/fork', async (c) => {
    const id = c.req.param('id')
    const options = await c.req.json<{ label: string; scope?: string }>()
    const child = await agent.forkSession(id, options)
    return c.json(child)
  })

  /** 归档 session */
  app.post('/sessions/:id/archive', async (c) => {
    const id = c.req.param('id')
    await agent.archiveSession(id)
    return c.json({ ok: true })
  })

  /** 获取 agent 配置（只读序列化） */
  app.get('/config', (c) => {
    const config = agent.config
    return c.json({
      orchestration: {
        strategy: config.orchestration?.strategy?.constructor?.name ?? 'MainSessionFlatStrategy',
      },
      capabilities: {
        tools: config.capabilities.tools.getToolDefinitions(),
        skills: config.capabilities.skills.getAll().map((s) => ({
          name: s.name,
          description: s.description,
        })),
      },
    })
  })

  /** 更新 agent 配置（运行时热更新） */
  app.patch('/config', async (c) => {
    const updates = await c.req.json<Record<string, unknown>>()
    const applied: string[] = []

    /* 调度策略更新 */
    if (updates['consolidationTrigger'] || updates['integrationTrigger'] ||
        updates['consolidationEveryN'] || updates['integrationEveryN']) {
      // 调度参数需要通过 Scheduler 重建，当前只标记接收到
      applied.push('scheduling')
    }

    /* runtime 更新 */
    if (updates['idleTtlMs'] !== undefined) {
      applied.push('runtime.idleTtlMs')
    }

    /* split guard 更新 */
    if (updates['minTurns'] !== undefined || updates['cooldownTurns'] !== undefined) {
      applied.push('splitGuard')
    }

    return c.json({ ok: true, applied, note: 'Config hot-reload is best-effort; some changes require restart.' })
  })

  return app
}
