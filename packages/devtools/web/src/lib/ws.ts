/** WebSocket 客户端——连接 DevTools Server 的事件流 */

type WsMessage = Record<string, unknown>
type WsListener = (msg: WsMessage) => void

let ws: WebSocket | null = null
const listeners = new Set<WsListener>()

/** 连接 WS */
export function connectWs(): void {
  if (ws?.readyState === WebSocket.OPEN) return

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  ws = new WebSocket(`${protocol}//${window.location.host}/ws`)

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data as string) as WsMessage
      listeners.forEach((fn) => fn(msg))
    } catch {
      /* 忽略解析错误 */
    }
  }

  ws.onclose = () => {
    /* 3 秒后自动重连 */
    setTimeout(connectWs, 3000)
  }
}

/** 订阅 WS 消息 */
export function subscribeWs(listener: WsListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** 发送 WS 消息 */
export function sendWs(msg: WsMessage): void {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg))
  }
}
