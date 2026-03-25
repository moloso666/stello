/** LLM 配置的 getter/setter，由调用方实现具体的 adapter 切换 */
export interface LLMConfigProvider {
  getConfig(): { model: string; baseURL: string; apiKey?: string; temperature?: number; maxTokens?: number }
  setConfig(config: { model: string; baseURL: string; apiKey?: string; temperature?: number; maxTokens?: number }): void
}

/** Consolidation/Integration 提示词的 getter/setter */
export interface PromptProvider {
  getPrompts(): { consolidate: string; integrate: string }
  setPrompts(prompts: { consolidate?: string; integrate?: string }): void
}

/** Session 级别的访问能力（读写 system prompt） */
export interface SessionAccessProvider {
  getSystemPrompt(sessionId: string): Promise<string | null>
  setSystemPrompt(sessionId: string, content: string): Promise<void>
}

/** startDevtools 配置 */
export interface DevtoolsOptions {
  /** 监听端口，默认 4800 */
  port?: number
  /** 是否自动打开浏览器，默认 true */
  open?: boolean
  /** LLM 配置提供者（传入后 Settings 页面可动态切换 LLM） */
  llm?: LLMConfigProvider
  /** Consolidation/Integration 提示词提供者 */
  prompts?: PromptProvider
  /** Session 级别访问（system prompt 读写） */
  sessionAccess?: SessionAccessProvider
}

/** startDevtools 返回值 */
export interface DevtoolsInstance {
  /** 实际监听端口 */
  port: number
  /** 关闭 devtools server */
  close(): Promise<void>
}
