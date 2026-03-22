# StelloAgent Basic Demo

这个 demo 展示当前 `@stello-ai/core` 最外层对象 `StelloAgent` 的基本用法。

目标不是展示完整产品能力，而是回答两个问题：

1. 现在怎么初始化一个 `StelloAgent`
2. 初始化后，外部怎么和整个 AgentApp 交互

---

## 1. 运行

在仓库根目录执行：

```bash
node --import tsx demo/stello-agent-basic/demo.ts
```

这个 demo 不依赖真实 LLM，也不依赖 `@stello-ai/server`。
它只展示 `core` 当前的本地使用方式。

---

## 2. 结构

这个 demo 用了当前推荐的分组式 `StelloAgentConfig`：

```ts
const agent = createStelloAgent({
  sessions,
  memory,
  session: {
    sessionResolver,
    consolidateFn,
  },
  capabilities: {
    lifecycle,
    tools,
    skills,
    confirm,
  },
  runtime: {
    recyclePolicy: {
      idleTtlMs: 30_000,
    },
  },
})
```

这里最重要的几组含义：

- `sessions`
  - SessionTree / topology 数据
- `memory`
  - memory 访问入口
- `session`
  - 真实 Session 接入配置
- `capabilities`
  - lifecycle / tools / skills / confirm 能力注入
- `runtime`
  - engine runtime 生命周期策略

---

## 3. 对外接口

初始化完成后，通常通过这些方法和 AgentApp 交互：

```ts
await agent.enterSession(sessionId)
const result = await agent.turn(sessionId, '继续分析这个任务')
await agent.leaveSession(sessionId)
```

如果是连接态场景，还可以：

```ts
await agent.attachSession(sessionId, connectionId)
await agent.turn(sessionId, '继续分析这个任务')
await agent.detachSession(sessionId, connectionId)
```

注意：

- 这个 demo 配了 `runtime.recyclePolicy.idleTtlMs = 30_000`
- 所以 `detachSession()` 之后 runtime 不会立刻销毁
- 你会看到 `active: true, refCount: 0`
- 这是延迟回收的预期行为，不是泄漏

---

## 4. 这个 demo 演示了什么

它会按顺序演示：

1. 创建根 session
2. 初始化 `StelloAgent`
3. 进入 root session
4. 跑一轮 `turn()`
5. fork 一个 child session
6. attach / detach runtime

---

## 5. 下一步怎么接真实 Session

现在 demo 里已经走的是 `session.sessionResolver + consolidateFn` 这条正式接入路径。

如果你后面要接 Session 同学的真实实现，主要替换这几块：

- `sessionResolver`
  - 真实返回 `@stello-ai/session` 的 `Session`
- `consolidateFn`
  - 真实的 L3 -> L2 提炼逻辑
- `mainSessionResolver`
  - 如果要接 MainSession 的 integration，再补上
- `integrateFn`
  - 如果要做 synthesis / insights，再补上

---

## 6. 当前边界

这个 demo 只覆盖 `core`：

- 不暴露 REST API
- 不暴露 WebSocket 协议
- 不依赖 `@stello-ai/server`

一句话：

**这是 `StelloAgent` 作为本地 AgentApp 入口的最小用法示例。**
