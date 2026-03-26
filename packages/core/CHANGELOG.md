# @stello-ai/core

## 0.2.0

### Minor Changes

- # v0.2.0 Release

  ## @stello-ai/core

  ### 新增功能
  - 新增 StelloAgent 门面对象，提供统一的编排入口
  - 新增 SessionOrchestrator，支持多 Session 树管理
  - 新增 DefaultEngineFactory 和 DefaultEngineRuntimeManager
  - 新增 StelloEngine 执行周期管理器
  - 新增 TurnRunner 和 Scheduler，支持 tool call 循环和任务调度
  - 与 @stello-ai/session@0.2.0 完全集成

  ### 改进
  - 简化 API 接口，降低使用门槛
  - 完善生命周期钩子
  - 新增大量测试覆盖

  ## @stello-ai/devtools

  ### 新增功能
  - 首次发布开发者工具包
  - 支持 HTTP/WebSocket 服务器
  - 提供可视化调试界面（拓扑图、对话记录、事件监控）
  - 支持实时配置编辑
  - 支持多语言界面（中英文）

  ## @stello-ai/server

  ### 新增功能
  - 首次发布服务器包
  - 支持 HTTP REST API 和 WebSocket 实时通信
  - 支持 PostgreSQL 持久化存储
  - 支持多租户（Space 管理）
  - 内置 Agent Pool 和连接管理

  ### 特性
  - 开箱即用的 Docker Compose 配置
  - 完整的数据库迁移脚本
  - RESTful API 设计
