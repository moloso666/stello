<p align="right">
  <a href="./README_EN.md">English</a> | <a href="#中文">中文</a>
</p>

<a id="中文"></a>

<div align="center">
  <img src="./stello_logo.svg" alt="Stello" width="200">

  <h1>Stello</h1>

  <p><strong>用 AI Native 的方式认识世界</strong></p>
  <p>你的思维正在发散成长！别让线性对话限制了它！</p>

  <p>
    <a href="https://www.npmjs.com/package/@stello-ai/core"><img src="https://img.shields.io/npm/v/@stello-ai/core.svg" alt="npm version"></a>
    <a href="./LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" alt="License"></a>
  </p>
</div>

<br/>

## 🤔 Stello 解决什么问题？

你是否觉得与AI的交流被困在了一条直线里，当你的思维开始发散，多方向展开并交织，对话越来越长，但上下文逐渐吃紧，回复质量悄然下降。两小时后关掉窗口，什么结构都没留下。几天后想继续，连自己聊到哪了都想不起来。

**不是模型不够强，是你与AI的协作方式太原始！**

你的思维在发散成长，AI却只通过一个滚动窗口和你线性交互！

Stello 把这条线炸开成一张网！Stello构建了人与AI的全新协作范式，每一次对话都在构建一个具备自我意识且会生长的认知拓扑。

**你与AI，在Stello里共同进化。**

<br/>

## 💡 Stello 是什么？

**首个 AI Native 认知拓扑系统。**

Stello 是一个开源的会话拓扑引擎，面向 AI Agent 和 AI 应用开发者。它提供对话自动分裂、三层分级记忆、全局意识整合和拓扑可视化四大核心能力。

对话按语义自动分裂为独立 Session，形成树状拓扑结构。三层记忆系统在 Session 之间分级继承。全局意识层（Main Session）跨所有分支感知冲突与依赖，并定向推送洞察。整棵认知拓扑渲染为可生长可对话的星空节点图。

---

## ✨ 核心能力

- 🌳 **对话自动分裂** — AI 识别话题分叉时通过工具调用创建子 Session，每个分支有明确 scope
- 🧠 **三层分级记忆** — L3 原始对话 / L2 技能描述 / L1 全局认知，记忆在层级间流动
- 🔄 **全局意识整合** — Main Session 收集所有子 Session 的 L2，生成 synthesis 并推送 insights
- ⚡️ **对话中零开销** — 所有记忆提炼异步执行（fire-and-forget），不阻塞对话流程
- 🎨 **星空图可视化** — 每颗星是一个思考方向，连线是关联，大小映射深度，亮度映射活跃度
- 🔌 **完全解耦架构** — 不绑定 LLM / 存储 / UI，Session 与 Topology 分离

---

## 🚀 快速开始

### 安装

```bash
npm install @stello-ai/core @stello-ai/session
# 或
pnpm add @stello-ai/core @stello-ai/session

# 开发调试时安装
pnpm add -D @stello-ai/devtools
```

### 30 秒示例

```typescript
import { createStelloAgent } from '@stello-ai/core'
import { FileSystemStorageAdapter } from '@stello-ai/core/adapters'

// 创建 Agent
const agent = await createStelloAgent({
  sessions: /* SessionTree 实现 */,
  memory: /* MemoryEngine 实现 */,
  session: {
    llm: yourLLMAdapter,
    sessionResolver: async (id) => /* 返回 Session 实例 */,
  },
})

// 开始对话
const result = await agent.turn('main-session-id', '帮我规划一个创业项目')

// AI 自动识别话题分叉，创建子 Session
// 你在不同分支深入，Main Session 保持全局视野
```

### 启动可视化调试

```typescript
import { startDevtools } from '@stello-ai/devtools'

await startDevtools(agent, {
  port: 4800,
  open: true
})

// 浏览器自动打开 http://localhost:4800
// 看到星空图 + 对话面板 + 实时事件流
```

---

## 📦 包说明

<table>
<tr>
<td width="50%" valign="top">

### @stello-ai/session

**独立对话单元**，三层记忆的最小实现。

- ✅ 单次 LLM 调用（send / stream）
- ✅ L3 对话记录持久化
- ✅ L2 技能描述生成（consolidate）
- ✅ 与树结构完全解耦
- ✅ 支持流式输出和工具调用

**适合：** 只需要单个对话 + 记忆的简单场景

</td>
<td width="50%" valign="top">

### @stello-ai/core

**编排引擎**，Session 树的调度层。

- ✅ 工具调用循环（turn）
- ✅ Consolidation / Integration 调度
- ✅ Main Session 全局意识
- ✅ Session 树管理（fork / archive / refs）
- ✅ 分叉保护和策略配置
- ✅ Lifecycle hooks 和事件系统

**适合：** 构建需要多分支对话 + 全局整合的复杂应用

</td>
</tr>
<tr>
<td width="50%" valign="top">

### @stello-ai/server

**服务化层**，PostgreSQL + HTTP/WebSocket。

- ✅ REST + WebSocket 双通道
- ✅ PostgreSQL 持久化（7 张表）
- ✅ 多租户 Space 管理
- ✅ AgentPool 懒加载 + 自动回收
- ✅ Per-session prompt 三级 fallback
- ✅ 开箱即用的 Docker Compose

**适合：** 需要生产级部署 + 多用户隔离的 SaaS 应用

</td>
<td width="50%" valign="top">

### @stello-ai/devtools

**开发调试工具**，星空图 + 实时面板。

- ✅ 交互式星空图（拖拽 / 缩放）
- ✅ 对话面板 + 文件浏览器
- ✅ 实时事件监控
- ✅ Apple Liquid Glass 视觉风格
- ✅ 一行代码接入

**适合：** 开发阶段可视化调试（非生产依赖）

</td>
</tr>
</table>

---

## 🎯 核心概念

### 技能隐喻

每个子 Session 是一个**技能**，Main Session 是**技能调用方**。

```
子 Session = 技能
  L3 = 技能的详细知识体（内部消费）
  L2 = 技能的 description（外部接口，Main Session 消费）

Main Session = 调用方
  synthesis = 对所有 L2 的综合认知
  insights = 定向推送给各子 Session 的建议
```

**核心约束：**
- L2 对子 Session 自身不可见 — L2 是外部描述，不是自用记忆
- Main Session 只读 L2，不读子 Session 的 L3
- 子 Session 之间完全隔离，唯一的跨分支信息来源是 Main Session 推送的 insights

---

### 三层记忆

| 层 | 内容 | 消费者 |
|----|------|--------|
| **L3** | 原始对话记录 | 该 Session 自身的 LLM |
| **L2** | 技能描述（外部视角） | Main Session（通过 integration） |
| **L1** | 全局键值 + synthesis | 应用层直接读写 |

**记忆流动：**
- **向上汇报** — L3 → L2 → Main Session index
- **向下推送** — Main Session insights → 子 Session
- **横向隔离** — 子 Session 之间无直接通信

---

## 💡 适合场景

- **深度咨询** — 法律、医疗、财务等多维度分析，避免信息污染
- **知识探索** — 学习、研究多个主题并行，自动构建知识地图
- **目标分解** — 创业规划、项目管理、OKR 落地等层级任务
- **体系构建** — 课程体系、知识体系、产品架构等层级设计
- **创意创作** — 内容、设计多方案并行探索，保持全局一致性
- **办公协作** — 多任务统筹，AI 发现遗漏和跨任务依赖

适合需要**同时推进多个方向 + 保持全局视野**的复杂场景。

---

## 📚 文档

- 📖 **完整教程** — _即将上线_
- 🎯 **核心概念** — _即将上线_
- 📦 **API 参考** — _即将上线_
- 💡 **示例代码** — _即将上线_
- 🏗️ **架构设计** — _即将上线_
- 💬 **社区讨论** — _即将开放_

---

## 🤝 贡献

欢迎贡献！详见 [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## 📄 许可证

Apache-2.0 © [Stello Team](https://github.com/stello-agent)
