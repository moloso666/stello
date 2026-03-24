import type { Server as HttpServer } from 'node:http'
import { Hono } from 'hono'
import type { StelloAgent } from '@stello-ai/core'
import { createRoutes } from './routes.js'
import { createWsHandler } from './ws-handler.js'
import type { DevtoolsOptions, DevtoolsInstance } from './types.js'

/** 启动 DevTools 调试服务器 */
export async function startDevtools(
  agent: StelloAgent,
  options: DevtoolsOptions = {},
): Promise<DevtoolsInstance> {
  const { port = 4800, open = true } = options

  const app = new Hono()

  /* API 路由 */
  const api = createRoutes(agent)
  app.route('/api', api)

  /* 前端静态文件（构建后内嵌） */
  // TODO: Phase 1 Task 6 集成时配置静态文件 serve

  const { serve } = await import('@hono/node-server')

  return new Promise((resolve) => {
    const server = serve({ fetch: app.fetch, port }, (info) => {
      /* 附着 WS */
      createWsHandler(server as unknown as HttpServer, agent)

      const url = `http://localhost:${info.port}`
      console.log(`\n  Stello DevTools running at ${url}\n`)

      /* 自动打开浏览器 */
      if (open) {
        import('node:child_process').then(({ exec }) => {
          const cmd = process.platform === 'darwin'
            ? 'open'
            : process.platform === 'win32'
              ? 'start'
              : 'xdg-open'
          exec(`${cmd} ${url}`)
        })
      }

      resolve({
        port: info.port,
        async close() {
          server.close()
        },
      })
    })
  })
}
