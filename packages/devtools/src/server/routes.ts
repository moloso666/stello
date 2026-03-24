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

  return app
}
