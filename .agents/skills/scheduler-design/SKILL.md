---
name: scheduler-design
description: Consolidation 触发机制：自动触发通过 Factory 配置内联，手动触发通过 StelloAgent API。
---

# Consolidation 触发机制

## 概述

Scheduler 类已删除。Consolidation 和 integration 的触发机制简化为两条路径：

1. **自动触发**：`consolidateEveryNTurns` 配置项，由 Factory 内联处理
2. **手动触发**：`agent.consolidateSession(sessionId)` 和 `agent.integrate()`

---

## 自动 Consolidation

在 `orchestration` 配置中设置 `consolidateEveryNTurns`，每 N 轮对话后自动触发 consolidation：

```typescript
orchestration: {
  consolidateEveryNTurns: 5,  // 每 5 轮自动 consolidate
}
```

这是框架提供的唯一自动触发策略。逻辑内联在 Factory 的 hook 中，无独立调度器组件。

---

## 手动触发

`StelloAgent` 提供两个第一方 API：

- `agent.consolidateSession(sessionId)`：对指定 session 执行 consolidation（L3 → L2）
- `agent.integrate()`：对 Main Session 执行 integration（所有 L2 → synthesis + insights）

应用层可在任意时机调用，例如 session 结束时、定时任务、用户操作后。

---

## Integration 无框架级自动触发

Integration 没有框架级自动触发策略。应用层负责决定何时调用 `agent.integrate()`——可在 hooks 中响应 consolidation 完成事件，也可完全独立调用。

---

## 设计决策

去掉 Scheduler 类是有意简化：调度策略的多样性带来了复杂性，但实际上大多数应用只需要"每 N 轮"和"手动"两种模式。将复杂调度逻辑交还给应用层，框架只保留最常用的内联策略。
