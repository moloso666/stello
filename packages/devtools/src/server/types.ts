/** startDevtools 配置 */
export interface DevtoolsOptions {
  /** 监听端口，默认 4800 */
  port?: number
  /** 是否自动打开浏览器，默认 true */
  open?: boolean
}

/** startDevtools 返回值 */
export interface DevtoolsInstance {
  /** 实际监听端口 */
  port: number
  /** 关闭 devtools server */
  close(): Promise<void>
}
