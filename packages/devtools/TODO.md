# DevTools TODO

> 当前状态：五个页面（Topology / Conversation / Inspector / Events / Settings）已完成，数据已打通真实 Agent。
> Settings 页面为只读展示，PATCH /config 已移除。

---

## ~~Phase 1：配置热更新~~ ✅

> 已完成：core 三组件 updateConfig + StelloAgent.updateConfig 门面 + PATCH /config + 前端可编辑 + 导入导出

---

## ~~Phase 2：对话过程可观测~~ ✅

> 已完成：流式 tool call 事件 + 折叠式卡片 / highlight.js 代码高亮 / Events label 自动刷新

---

## Phase 3：Topology 交互增强

### 3.1 右键菜单
- 节点右键弹出操作菜单：Enter Session / Fork / Archive / View in Inspector
- 调用对应 API 后刷新拓扑图

### 3.2 节点间过渡动画
- 从 Topology 点击节点跳转到 Conversation 时，加过渡动画（而非突兀切换）
- 考虑 shared layout animation 或 page transition

### 3.3 实时拓扑更新
- WS 接收 fork/archive 事件时自动重绘拓扑图
- 新节点出现时有 pop-in 动画

---

## Phase 4：Inspector 增强

### 4.1 L3 记录搜索 / 过滤
- 当前 Inspector 的 L3 records 是纯列表
- 加搜索框 + role 过滤器

### 4.2 JSON 语法高亮
- Session Meta / L2 / Scope 等 JSON 内容加语法高亮
- 可折叠的 JSON tree viewer

---

## Phase 5：工程化

### 5.1 DevTools 独立包发布
- 完善 package.json（description / keywords / repository）
- 写 README：安装方式、使用方法、截图
- 发布到 npm

### 5.2 清理遗留
- `ws.ts` 全局单例文件可能已无用（Conversation/Events 都用组件自管理 WS），确认后删除
- Topology 面板 children 展示优化

---

## 已完成

- [x] Topology 星空图（Canvas, pan/zoom/drag, BFS layout, breathing pulse）
- [x] Conversation 页面（NDJSON streaming, Markdown rendering, think tag filtering）
- [x] Inspector 页面（L3 records, L2 memory, scope, session meta）
- [x] Events 页面（WS real-time + history buffer, color-coded badges, filters）
- [x] Settings 页面（只读配置面板，完整展示所有 AgentConfig 字段）
- [x] 后端 REST routes + WS handler + EventBus
- [x] 真实数据打通（文件持久化 MemoryEngine, session 恢复）
- [x] Scheduler.getConfig() / SplitGuard.getConfig() 序列化方法
- [x] 清理 debug log / 无用 import / 空壳 PATCH
- [x] docs/stello-agent-config-reference.md 配置完全参考文档
- [x] Phase 1 配置热更新（idleTtlMs / Scheduler / SplitGuard + PATCH /config + 前端编辑 + 导入导出）
- [x] Phase 2 对话过程可观测（tool call 卡片 + highlight.js 代码高亮 + Events label 自动刷新）
