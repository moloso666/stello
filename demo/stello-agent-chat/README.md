# StelloAgent Chat Demo

这个 demo 展示三件事：

1. 用真实 OpenAI 兼容大模型接入当前 `StelloAgent`
2. 用 React + TailwindCSS + shadcn 风格组件做一个可交互工作台
3. 浏览器里实时看到 assistant 流式输出、工具调用和 session 树变化

## 运行前准备

至少需要配置：

```bash
export OPENAI_BASE_URL=https://api.minimaxi.com/v1
export OPENAI_API_KEY=你的 key
export OPENAI_MODEL=MiniMax-M1
```

如果你用别的 OpenAI 兼容服务，也可以改 `OPENAI_BASE_URL` 和 `OPENAI_MODEL`。

## 启动

在仓库根目录执行：

```bash
pnpm demo:chat
```

默认会启动在：

```text
http://127.0.0.1:3477
```

你也可以自定义：

```bash
export DEMO_HOST=127.0.0.1
export DEMO_PORT=3477
pnpm demo:chat
```

## 页面功能

当前页面支持：

- 查看 session 列表
- 查看 session 树
- 进入某个 session
- 发送消息并实时看到流式响应
- 通过按钮或模型工具调用创建子 session
- 把工具调用结果渲染成独立组件
- Markdown 方式展示 assistant 输出

## 对话里创建子 session

你可以直接在聊天框里输入类似：

```text
帮我创建一个子session，名字叫 UI Exploration，作用域是 ui
```

或者：

```text
创建一个子会话，名字叫 Landing Page
```

现在这条链已经走真实 tool call：

- 模型调用 `stello_create_session`
- engine 执行 `forkSession`
- 前端把 tool 调用过程渲染成单独组件

## 实现方式

这个 demo 仍然只依赖 `@stello-ai/core` 和 `@stello-ai/session`：

- 后端：本地 Node HTTP 服务
- 前端：Vite + React + TailwindCSS
- 大模型：`@stello-ai/session` 的 OpenAI 兼容 adapter

它不是 `@stello-ai/server`，只是为了先验证当前 core 形态已经能接真实模型并驱动一个最小 UI。

## 干跑验证

如果你只想验证装配是否成功，不想真的监听端口，可以：

```bash
DEMO_DRY_RUN=1 pnpm demo:chat
```

这会完成：

- core 依赖初始化
- session / main session 初始化
- StelloAgent 装配

然后直接退出。
