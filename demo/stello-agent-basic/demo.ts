import {
  CoreMemory,
  NodeFileSystemAdapter,
  SessionMemory,
  SessionTreeImpl,
  SkillRouterImpl,
  createStelloAgent,
  type ConfirmProtocol,
  type EngineLifecycleAdapter,
  type EngineToolRuntime,
  type MemoryEngine,
  type SessionTree,
  type SkillRouter,
  type StelloAgentConfig,
} from '../../packages/core/src/index'

const schema = {
  name: { type: 'string', default: '', bubbleable: true },
  goal: { type: 'string', default: '', bubbleable: true },
  topics: { type: 'array', default: [], bubbleable: true },
} as const

function section(title: string): void {
  console.log(`\n=== ${title} ===`)
}

function print(label: string, value: unknown): void {
  console.log(`\n${label}:`)
  console.log(JSON.stringify(value, null, 2))
}

/**
 * 这里用一个非常轻量的 session 兼容对象模拟 @stello-ai/session。
 * 真正接入时，把这里替换成真实 Session 实例即可。
 */
function createMockSession(id: string) {
  const records: Array<{ role: string; content: string; timestamp?: string }> = []
  let memory: string | null = null

  return {
    meta: {
      id,
      status: 'active' as const,
    },
    async send(content: string) {
      records.push({ role: 'user', content })

      if (content.includes('"toolResults"')) {
        const result = {
          content: `session(${id}) received tool result`,
          toolCalls: [],
        }
        records.push({ role: 'assistant', content: result.content })
        return result
      }

      const result = {
        content: null,
        toolCalls: [{ id: 'tool-1', name: 'stello_read_core', input: {} }],
      }
      records.push({ role: 'assistant', content: '' })
      return result
    },
    async messages() {
      return records
    },
    async consolidate(
      fn: (
        currentMemory: string | null,
        messages: Array<{ role: string; content: string; timestamp?: string }>,
      ) => Promise<string>,
    ) {
      memory = await fn(memory, records)
    },
  }
}

async function main(): Promise<void> {
  section('Prepare Core Dependencies')

  const fs = new NodeFileSystemAdapter('./tmp/stello-agent-basic')
  const sessions = new SessionTreeImpl(fs) as unknown as SessionTree
  const coreMemory = new CoreMemory(fs, schema)
  const sessionMemory = new SessionMemory(fs)
  const memory = {
    readCore: (path?: string) => coreMemory.readCore(path),
    writeCore: (path: string, value: unknown) => coreMemory.writeCore(path, value),
    readMemory: (sessionId: string) => sessionMemory.readMemory(sessionId),
    writeMemory: (sessionId: string, content: string) => sessionMemory.writeMemory(sessionId, content),
    readScope: (sessionId: string) => sessionMemory.readScope(sessionId),
    writeScope: (sessionId: string, content: string) => sessionMemory.writeScope(sessionId, content),
    readIndex: (sessionId: string) => sessionMemory.readIndex(sessionId),
    writeIndex: (sessionId: string, content: string) => sessionMemory.writeIndex(sessionId, content),
    appendRecord: (sessionId: string, record: { role: 'user' | 'assistant'; content: string; timestamp: string }) =>
      sessionMemory.appendRecord(sessionId, record),
    readRecords: (sessionId: string) => sessionMemory.readRecords(sessionId),
    assembleContext: async () => ({
      core: await coreMemory.readCore() as Record<string, unknown>,
      memories: [],
      currentMemory: null,
      scope: null,
    }),
  } as unknown as MemoryEngine

  await coreMemory.init()
  const root = await (sessions as SessionTreeImpl).createRoot('Main Session')
  print('root session', root)

  section('Prepare Agent Config')

  const mockSessions = new Map<string, ReturnType<typeof createMockSession>>()
  mockSessions.set(root.id, createMockSession(root.id))

  const lifecycle: EngineLifecycleAdapter = {
    bootstrap: async (sessionId) => ({
      context: {
        core: await coreMemory.readCore() as Record<string, unknown>,
        memories: [],
        currentMemory: null,
        scope: null,
      },
      session: await (sessions as SessionTreeImpl).get(sessionId),
    }),
    assemble: async () => ({
      core: await coreMemory.readCore() as Record<string, unknown>,
      memories: [],
      currentMemory: null,
      scope: null,
    }),
    afterTurn: async () => ({
      coreUpdated: false,
      memoryUpdated: false,
      recordAppended: true,
    }),
    prepareChildSpawn: async (options) => {
      const child = await (sessions as SessionTreeImpl).createChild(options)
      mockSessions.set(child.id, createMockSession(child.id))
      return child
    },
  }

  const tools: EngineToolRuntime = {
    getToolDefinitions: () => [
      {
        name: 'stello_read_core',
        description: 'Read current core state',
        parameters: { type: 'object', properties: {} },
      },
    ],
    async executeTool() {
      return {
        success: true,
        data: await coreMemory.readCore(),
      }
    },
  }

  const confirm: ConfirmProtocol = {
    async confirmSplit(proposal) {
      return lifecycle.prepareChildSpawn({
        parentId: proposal.parentId,
        label: proposal.suggestedLabel,
        scope: proposal.suggestedScope,
      })
    },
    async dismissSplit() {},
    async confirmUpdate() {},
    async dismissUpdate() {},
  }

  const config: StelloAgentConfig = {
    sessions,
    memory,
    session: {
      sessionResolver: async (sessionId) => {
        const session = mockSessions.get(sessionId)
        if (!session) {
          throw new Error(`Unknown session: ${sessionId}`)
        }
        return session
      },
      consolidateFn: async (_currentMemory, messages) => {
        return `summary(${messages.length})`
      },
    },
    capabilities: {
      lifecycle,
      tools,
      skills: new SkillRouterImpl() as SkillRouter,
      confirm,
    },
    runtime: {
      recyclePolicy: {
        idleTtlMs: 30_000,
      },
    },
  }

  print('config shape', {
    hasSessions: Boolean(config.sessions),
    hasMemory: Boolean(config.memory),
    hasSessionResolver: Boolean(config.session?.sessionResolver),
    hasConsolidateFn: Boolean(config.session?.consolidateFn),
    hasLifecycle: Boolean(config.capabilities.lifecycle),
    hasTools: Boolean(config.capabilities.tools),
    recyclePolicy: config.runtime?.recyclePolicy ?? null,
  })

  section('Create Agent')

  const agent = createStelloAgent(config)
  print('agent public surface', {
    methods: [
      'enterSession',
      'turn',
      'ingest',
      'leaveSession',
      'forkSession',
      'archiveSession',
      'attachSession',
      'detachSession',
    ],
  })

  section('Interact With Root Session')

  const bootstrap = await agent.enterSession(root.id)
  print('bootstrap', bootstrap)

  const turn = await agent.turn(root.id, 'Continue with the task')
  print('turn', turn)

  section('Fork Child Session')

  const child = await agent.forkSession(root.id, {
    label: 'UI Exploration',
    scope: 'ui',
  })
  print('child', child)

  section('Attach / Detach Runtime')

  await agent.attachSession(root.id, 'demo-connection')
  print('runtime status after attach', {
    active: agent.hasActiveEngine(root.id),
    refCount: agent.getEngineRefCount(root.id),
  })

  await agent.detachSession(root.id, 'demo-connection')
  print('runtime status after detach', {
    active: agent.hasActiveEngine(root.id),
    refCount: agent.getEngineRefCount(root.id),
  })

  console.log('\nDemo finished.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
