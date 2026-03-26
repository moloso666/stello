# Stello Core API 参考

本文档面向 Stello 框架的使用者，解释每个配置点的用途、适用场景和配置方式。

---

## 创建 Agent

```typescript
import { createStelloAgent } from '@stello-ai/core'

const agent = createStelloAgent(config)
```

`StelloAgent` 是 Stello 的统一入口。你不需要手动装配内部组件（Orchestrator、Engine、Scheduler），只需要通过配置声明你的意图。

配置分为五个区域，按职责划分：

| 区域 | 必填 | 职责 |
|------|------|------|
| `sessions` | 是 | 拓扑树存储 |
| `memory` | 是 | 记忆系统存储 |
| `capabilities` | 是 | 核心能力注入（生命周期、工具、技能、确认协议） |
| `session` | 否 | Session 接入（连接 @stello-ai/session 包） |
| `runtime` | 否 | 运行时行为（Session 解析、空闲回收） |
| `orchestration` | 否 | 编排策略（fork 路由、调度、拆分保护） |

---

## sessions — 拓扑树

Stello 的对话结构是一棵树。`sessions` 负责管理这棵树：创建节点、查询祖先/兄弟、生成递归树结构供前端渲染。

你需要提供一个实现了 `SessionTree` 接口的对象。框架内置两种实现：

- **SessionTreeImpl**（内存）— 适合本地开发和测试
- **PgSessionTree**（PostgreSQL）— 适合生产环境，由 `@stello-ai/server` 提供

## memory — 记忆引擎

Stello 的记忆分三层：L1（全局键值档案）、L2（Session 摘要）、L3（原始对话记录）。`memory` 负责这三层的读写和上下文组装。

同样需要提供 `MemoryEngine` 接口的实现。

---

## capabilities — 核心能力注入

这四个配置项定义了 Agent 的核心行为——进入 Session 时做什么、对话结束后做什么、工具怎么调用、技能怎么匹配。

### lifecycle — 生命周期适配器

生命周期适配器控制三个关键时刻：

**bootstrap** — 用户进入一个 Session 时，你需要组装初始上下文。通常是：读取 L1 核心档案 + 收集记忆链 + 读取当前 Session 的 scope。返回的 `BootstrapResult` 包含组装好的上下文和 Session 元数据。

**afterTurn** — 每轮对话结束后的善后工作。通常是：从 LLM 响应中提取 L1 变更、更新记忆摘要、追加 L3 对话记录。这个钩子是 fire-and-forget 的——失败不会阻塞对话。

**prepareChildSpawn** — fork 子 Session 前的准备工作。通常是：创建子 Session 的存储结构、生成 scope、拷贝继承的上下文。返回新创建的 `TopologyNode`。

### tools — 工具执行器

定义 Agent 可以使用的工具（function calling）。`getToolDefinitions()` 返回工具 schema，`executeTool()` 执行具体调用。

Engine 在 tool call 循环中自动调用这两个方法。如果 `executeTool` 抛错，错误信息会作为 tool result 返回给 LLM 继续推理，不会中断对话。

如果你的 Agent 不需要工具，提供空实现即可：`getToolDefinitions: () => []`。

### skills — 技能路由

技能是可注册的意图处理器。当调用 `agent.ingest()` 时，框架通过 `match()` 匹配当前消息对应的技能。

v0.1 采用关键词匹配。如果不需要技能系统，提供空实现即可。

### confirm — 确认协议

当 Agent 建议拆分 Session 或修改 L1 关键字段时，触发确认协议。框架只负责发出提案（`SplitProposal` / `UpdateProposal`），你决定怎么展示给用户、怎么处理确认或拒绝。

典型场景：Agent 对话中判断应该拆分子话题 → 触发 `SplitProposal` → 你的前端弹出确认对话框 → 用户确认 → 调用 `confirmSplit` → 创建子 Session。

---

## session — Session 接入配置

这组配置用于把 `@stello-ai/session` 包的真实 Session 接入 core 的编排体系。这是推荐的接入方式。

### sessionResolver — Session 解析器

告诉框架如何根据 sessionId 获取一个真实的 Session 对象。每次 Engine 需要操作某个 Session 时都会调用这个函数。

```typescript
sessionResolver: async (sessionId) => {
  return await loadSession(sessionId, { storage, llm })
}
```

### mainSessionResolver — Main Session 解析器

告诉框架如何获取 Main Session。仅在配置了 integration 时需要。返回 null 表示当前没有 Main Session（此时 integration 不执行）。

一个 Space 通常只有一个 Main Session（树的根节点）。

### consolidateFn — L3 → L2 提炼函数

**这是什么？** 每个子 Session 积累了一段对话（L3）后，需要提炼成一段简洁的摘要（L2）。这段 L2 不是给子 Session 自己看的，而是给 Main Session 看的——就像一个员工向主管汇报工作摘要。

**函数签名：**
- 输入：`currentMemory`（上次的 L2，可能为 null）+ `messages`（所有 L3 对话记录）
- 输出：新的 L2 字符串

**何时触发？** 由 Scheduler 控制（见下文 `orchestration.scheduler`）。

**内置默认实现：**

框架提供了 `createDefaultConsolidateFn(prompt, llm)` 工厂函数。你只需要提供一个 prompt 和一个 LLM 调用函数：

```typescript
import { createDefaultConsolidateFn, DEFAULT_CONSOLIDATE_PROMPT } from '@stello-ai/core'

const consolidateFn = createDefaultConsolidateFn(DEFAULT_CONSOLIDATE_PROMPT, myLLMCall)
```

`DEFAULT_CONSOLIDATE_PROMPT` 是内置的中文提炼提示词，要求 LLM 输出 100-150 字的工作备忘风格摘要。你可以替换为自己的 prompt。

`LLMCallFn` 是最小的 LLM 调用接口——接收消息数组，返回文本：

```typescript
type LLMCallFn = (messages: Array<{ role: string; content: string }>) => Promise<string>
```

**完全自定义：** 你也可以不用内置实现，直接提供一个函数。比如用不同的 LLM、不同的输出格式、或者根本不调 LLM 而是用规则引擎。

### integrateFn — 综合分析函数

**这是什么？** Main Session 收集所有子 Session 的 L2 摘要，生成两样东西：
1. **synthesis** — 对所有 L2 的综合认知（Main Session 自己用）
2. **insights** — 给各个子 Session 的定向建议（下次对话时注入子 Session 的上下文）

这是 Stello 跨 Session 通信的唯一通道。子 Session 之间完全不感知彼此，只能通过 Main Session 推送的 insights 获取跨 Session 信息。

**函数签名：**
- 输入：`children`（所有子 Session 的 L2 列表，包含 sessionId 和 label）+ `currentSynthesis`（上次的 synthesis）
- 输出：`{ synthesis, insights: [{ sessionId, content }] }`

**内置默认实现：**

```typescript
import { createDefaultIntegrateFn, DEFAULT_INTEGRATE_PROMPT } from '@stello-ai/core'

const integrateFn = createDefaultIntegrateFn(DEFAULT_INTEGRATE_PROMPT, myLLMCall)
```

`DEFAULT_INTEGRATE_PROMPT` 要求 LLM 输出 JSON 格式的 synthesis + insights。如果你自定义 prompt，需要确保 LLM 输出可解析的 JSON（内置实现有容错处理，会尝试从响应中提取 JSON 块）。

### serializeSendResult — send() 结果序列化

`session.send()` 返回的是结构化对象（content + toolCalls + usage），但 Engine 内部用字符串传递。默认用 JSON 序列化。

**何时需要自定义？** 如果你的 Session 实现返回非标准格式，或者你想优化序列化性能。大多数情况下不需要配置。

### toolCallParser — 工具调用解析器

与 `serializeSendResult` 配对。TurnRunner 用它从序列化字符串中解析出 tool call 信息。

**规则：** 自定义了 `serializeSendResult` 就必须配套提供 `toolCallParser`。否则用默认的即可。

---

## runtime — 运行时配置

### resolver — Session Runtime 解析器

**这是高级接口。** 大多数用户应该用 `session.*` 配置路径，不需要直接提供 resolver。

`resolver` 让你完全控制"给定一个 sessionId，返回什么样的运行时 Session"。它绕过了 `session.sessionResolver + session.consolidateFn` 的自动适配。

**典型用途：** Server 层需要为每个 Session 创建不同的 consolidateFn（per-session prompt），就在 resolver 中用闭包捕获 sessionId：

```typescript
runtime: {
  resolver: {
    resolve: async (sessionId) => {
      const session = await loadSession(sessionId, { storage, llm })
      const consolidateFn = async (mem, msgs) => {
        const prompt = await db.getConsolidatePrompt(sessionId)  // per-session prompt
        return callLLM(prompt, mem, msgs)
      }
      return adaptSessionToEngineRuntime(session, { consolidateFn })
    }
  }
}
```

`adaptSessionToEngineRuntime` 和 `adaptMainSessionToSchedulerMainSession` 从 `@stello-ai/core` 导出，供高级用户使用。

### recyclePolicy — 空闲回收策略

Engine runtime 是有状态的（持有 turnCount、内部缓存等）。当所有持有者（如 WS 连接）释放后，runtime 会被回收。

```typescript
recyclePolicy: {
  idleTtlMs: 30000  // 空闲 30 秒后回收
}
```

- **默认 0**：引用归零立即回收。适合 REST 场景（每次请求独立）。
- **设为 > 0**：引用归零后等待一段时间再回收。适合 WS 场景——用户短暂断线重连后可以复用 runtime，避免重新 bootstrap。

**可热更新**：`agent.updateConfig({ runtime: { idleTtlMs: 60000 } })`

---

## orchestration — 编排配置

这组配置控制多 Session 协调行为：fork 时子 Session 挂到哪里、何时触发 consolidation/integration、拆分保护规则。

### strategy — Fork 路由策略

当用户从某个 Session 发起 fork 时，子 Session 应该挂到树的哪个位置？

**默认策略 `MainSessionFlatStrategy`**：所有 fork 都挂到根节点（Main Session）下，形成平铺结构。即使从子 Session A 发起 fork，新 Session 也不会挂在 A 下面，而是挂在 Main Session 下面。

**自定义策略：** 实现 `OrchestrationStrategy` 接口的 `resolveForkParent(source, sessions)` 方法。`source` 是发起 fork 的节点（TopologyNode），返回目标父节点的 ID。

### splitGuard — 拆分保护

防止 Agent 过早或过于频繁地拆分 Session。

```typescript
new SplitGuard(sessions, {
  minTurns: 3,       // 至少对话 3 轮才允许拆分
  cooldownTurns: 5,  // 两次拆分之间至少间隔 5 轮
})
```

**为什么需要？** LLM 可能在对话刚开始时就建议拆分，但此时上下文不够丰富，拆分质量低。minTurns 强制等待足够轮次；cooldownTurns 防止连续拆分导致碎片化。

**可热更新**：`agent.updateConfig({ splitGuard: { minTurns: 5, cooldownTurns: 10 } })`

### scheduler — 调度器

控制 consolidation（L3→L2 提炼）和 integration（综合分析）的触发时机。

```typescript
new Scheduler({
  consolidation: { trigger: 'everyNTurns', everyNTurns: 5 },
  integration: { trigger: 'afterConsolidate' },
})
```

#### Consolidation 触发时机

| trigger | 含义 | 适用场景 |
|---------|------|---------|
| `'manual'` | 不自动触发，由应用层手动调用 | 需要精确控制的场景 |
| `'everyNTurns'` | 每 N 轮对话后触发 | 最常用，平衡实时性和开销 |
| `'onSwitch'` | 切换到其他 Session 时触发 | 确保离开前摘要是最新的 |
| `'onArchive'` | Session 归档时触发 | 归档前生成最终 L2 |
| `'onLeave'` | 离开 Session 时触发 | 每次离开都更新 |

#### Integration 触发时机

| trigger | 含义 | 适用场景 |
|---------|------|---------|
| `'manual'` | 不自动触发 | 需要精确控制的场景 |
| `'afterConsolidate'` | consolidation 完成后联动触发 | 最常用，确保 L2 更新后立即综合 |
| `'everyNTurns'` | 每 N 轮对话后触发 | 独立于 consolidation 的节奏 |
| `'onSwitch'` | 切换 Session 时触发 | 切换前更新全局认知 |
| `'onArchive'` | Session 归档时触发 | 归档后重新综合 |
| `'onLeave'` | 离开 Session 时触发 | 每次离开都更新 |

**推荐组合**：`consolidation: everyNTurns(5)` + `integration: afterConsolidate`。这意味着每 5 轮对话后自动提炼 L2，提炼完成后自动触发综合分析。

所有调度都是 **fire-and-forget** 的——不阻塞 `turn()` 返回。调度失败只会 emit error 事件，不影响对话。

**可热更新**：`agent.updateConfig({ scheduling: { consolidation: { trigger: 'onLeave' } } })`

### hooks — 自定义生命周期钩子

在 Engine 的各个生命周期事件点插入自定义逻辑。与 Scheduler 的闭包合并——同一个事件点上，你的 hook 和 Scheduler 的 hook 都会触发。

所有 hooks 都是 fire-and-forget 的。抛错只会 emit error，不中断对话。

### mainSession — 手动提供 SchedulerMainSession

**高级接口。** 跳过 `session.mainSessionResolver + session.integrateFn` 的自动适配路径，直接提供 integration 的执行逻辑。Server 层用此接口实现 per-session integratePrompt。

---

## StelloAgent 实例方法

### 对话操作

**enterSession(sessionId)** — 进入 Session。执行 bootstrap，返回组装好的上下文和 Session 元数据。必须在 `turn()`/`stream()` 之前调用。

**turn(sessionId, input, options?)** — 非流式对话。发送消息，Engine 自动处理 tool call 循环，返回最终结果。包含 Scheduler 可能触发的 consolidation/integration（fire-and-forget，不阻塞返回）。

**stream(sessionId, input, options?)** — 流式对话。返回 async iterator（逐 chunk 输出）+ result promise（最终完整结果）。

**ingest(sessionId, message)** — Skill 意图匹配。传入用户消息，返回匹配到的 Skill 名称。

**leaveSession(sessionId)** — 离开 Session。可能触发 onLeave 调度。

**forkSession(sessionId, options)** — 从指定 Session 发起 fork。`options` 包含 `label`（必填）和 `scope`（可选）。经过 SplitGuard 检查和 OrchestrationStrategy 路由后创建子 Session，返回 `TopologyNode`。

**archiveSession(sessionId)** — 归档 Session。标记为 archived，可能触发 onArchive 调度。归档后的 Session 不再接受写操作。

### 连接态管理

这组方法主要供 Server 层使用，管理 WS 连接与 Engine runtime 的绑定关系。

**attachSession(sessionId, holderId)** — 登记一个 runtime 持有者（如一个 WS 连接）。如果 runtime 不存在则创建。

**detachSession(sessionId, holderId)** — 释放一个持有者。当所有持有者释放后，runtime 根据 `recyclePolicy` 回收。

**hasActiveEngine(sessionId)** / **getEngineRefCount(sessionId)** — 检查 runtime 状态。

### 热更新

```typescript
agent.updateConfig({
  runtime: { idleTtlMs: 30000 },
  scheduling: { consolidation: { trigger: 'everyNTurns', everyNTurns: 3 } },
  splitGuard: { minTurns: 5, cooldownTurns: 10 },
})
```

仅支持值类型字段（数字、字符串、枚举）。函数和对象引用类配置（如 consolidateFn、lifecycle）在构造时注入，运行期不可修改。

### 只读属性

**sessions** — `SessionTree` 引用。可直接调用 `agent.sessions.getTree()` 等方法查询拓扑。

**memory** — `MemoryEngine` 引用。可直接调用 `agent.memory.readRecords(sessionId)` 等方法读取数据。

**config** — 归一化后的完整配置。

---

## 两种接入模式

### 模式 1：session 路径（推荐）

提供 `session.sessionResolver + session.consolidateFn`，框架自动把 `@stello-ai/session` 的 Session 适配成 Engine 运行时。适合大多数场景。

```typescript
createStelloAgent({
  sessions, memory, capabilities,
  session: {
    sessionResolver: async (id) => loadSession(id, { storage, llm }),
    mainSessionResolver: async () => loadMainSession(rootId, { storage, llm }),
    consolidateFn: createDefaultConsolidateFn(prompt, llm),
    integrateFn: createDefaultIntegrateFn(prompt, llm),
  },
  orchestration: {
    scheduler: new Scheduler({
      consolidation: { trigger: 'everyNTurns', everyNTurns: 5 },
      integration: { trigger: 'afterConsolidate' },
    }),
  },
})
```

### 模式 2：runtime.resolver 路径（高级）

直接提供 `SessionRuntimeResolver`，完全控制每个 Session 的运行时行为。适合需要 per-session 自定义（如不同 Session 用不同的 consolidateFn）的场景。

```typescript
createStelloAgent({
  sessions, memory, capabilities,
  runtime: {
    resolver: {
      resolve: async (sessionId) => {
        const session = await loadSession(sessionId, { storage, llm })
        const prompt = await db.getPromptForSession(sessionId)
        const consolidateFn = createDefaultConsolidateFn(prompt, llm)
        return adaptSessionToEngineRuntime(session, { consolidateFn })
      },
    },
  },
})
```

`adaptSessionToEngineRuntime` 和 `adaptMainSessionToSchedulerMainSession` 从 `@stello-ai/core` 导出，供此模式使用。

---

## 内置默认提示词

框架提供两个可直接使用的默认提示词常量：

**DEFAULT_CONSOLIDATE_PROMPT** — 要求 LLM 将对话提炼为 100-150 字的简洁摘要，聚焦核心结论，省略过程细节，输出连贯文字。

**DEFAULT_INTEGRATE_PROMPT** — 要求 LLM 综合所有子会话摘要，输出 JSON 格式的 synthesis（综合分析）+ insights（per-child 建议）。

两者均可通过 `createDefaultConsolidateFn(yourPrompt, llm)` 和 `createDefaultIntegrateFn(yourPrompt, llm)` 替换为自定义 prompt。
