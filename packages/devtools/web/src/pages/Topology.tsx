import { useRef, useEffect, useState, useCallback } from 'react'
import { GitBranch, Archive } from 'lucide-react'

/** 拓扑节点 */
interface TopoNode {
  id: string
  label: string
  parentId: string | null
  status: 'active' | 'archived'
  turns: number
  children: string[]
  refs: string[]
}

/** 布局后节点 */
interface LayoutNode extends TopoNode {
  x: number
  y: number
  size: number
  color: string
  glowColor: string
  brightness: number
}

/** Mock 拓扑数据 */
const mockNodes: TopoNode[] = [
  { id: 'main', label: 'Main', parentId: null, status: 'active', turns: 24, children: ['research', 'coding', 'old-api', 'sess-h'], refs: [] },
  { id: 'research', label: 'research', parentId: 'main', status: 'active', turns: 12, children: ['papers', 'notes', 'draft'], refs: [] },
  { id: 'coding', label: 'coding', parentId: 'main', status: 'active', turns: 8, children: ['sess-e', 'sess-j'], refs: ['notes'] },
  { id: 'papers', label: 'papers', parentId: 'research', status: 'active', turns: 4, children: ['sess-i'], refs: ['old-api'] },
  { id: 'notes', label: 'notes', parentId: 'research', status: 'active', turns: 3, children: [], refs: [] },
  { id: 'draft', label: 'draft', parentId: 'research', status: 'active', turns: 1, children: [], refs: [] },
  { id: 'old-api', label: 'old-api', parentId: 'main', status: 'archived', turns: 6, children: [], refs: [] },
  { id: 'sess-h', label: 'Session H', parentId: 'main', status: 'archived', turns: 2, children: [], refs: [] },
  { id: 'sess-e', label: 'archived', parentId: 'coding', status: 'archived', turns: 5, children: [], refs: [] },
  { id: 'sess-i', label: 'Session I', parentId: 'papers', status: 'archived', turns: 1, children: [], refs: [] },
  { id: 'sess-j', label: 'Session J', parentId: 'coding', status: 'active', turns: 2, children: [], refs: [] },
]

/** 节点颜色映射 */
function getNodeStyle(node: TopoNode, isMain: boolean): { color: string; glowColor: string } {
  if (isMain) return { color: '#C4A882', glowColor: 'rgba(196,168,130,0.5)' }
  if (node.status === 'archived') return { color: '#D89575', glowColor: 'rgba(216,149,117,0.3)' }
  if (node.children.length === 0) return { color: '#A8C4A0', glowColor: 'rgba(168,196,160,0.3)' }
  return { color: '#B8956A', glowColor: 'rgba(184,149,106,0.35)' }
}

/** 同心环布局算法 */
function computeLayout(nodes: TopoNode[], width: number, height: number): LayoutNode[] {
  const cx = width / 2
  const cy = height / 2
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const result: LayoutNode[] = []

  /* BFS 分层 */
  const root = nodes.find((n) => n.parentId === null)
  if (!root) return result

  const layers: TopoNode[][] = [[root]]
  const visited = new Set([root.id])
  let current = [root]

  while (current.length > 0) {
    const next: TopoNode[] = []
    for (const node of current) {
      for (const childId of node.children) {
        const child = nodeMap.get(childId)
        if (child && !visited.has(child.id)) {
          visited.add(child.id)
          next.push(child)
        }
      }
    }
    if (next.length > 0) layers.push(next)
    current = next
  }

  /* 按层分配位置 */
  const ringSpacing = Math.min(width, height) * 0.18
  const maxTurns = Math.max(...nodes.map((n) => n.turns), 1)

  for (let layer = 0; layer < layers.length; layer++) {
    const ring = layers[layer]!
    const radius = layer === 0 ? 0 : ringSpacing * layer

    for (let i = 0; i < ring.length; i++) {
      const node = ring[i]!
      const isMain = node.parentId === null
      const angle = ring.length === 1 ? 0 : (2 * Math.PI * i) / ring.length - Math.PI / 2

      /* 加一点随机偏移让星空图更自然 */
      const jitterX = layer === 0 ? 0 : (Math.sin(i * 7.3 + layer * 2.1) * ringSpacing * 0.15)
      const jitterY = layer === 0 ? 0 : (Math.cos(i * 5.7 + layer * 3.4) * ringSpacing * 0.15)

      const x = cx + Math.cos(angle) * radius + jitterX
      const y = cy + Math.sin(angle) * radius + jitterY

      const sizeBase = isMain ? 18 : 6
      const sizeScale = (node.turns / maxTurns) * 10
      const size = sizeBase + sizeScale

      const { color, glowColor } = getNodeStyle(node, isMain)
      const brightness = node.status === 'archived' ? 0.5 : 0.8 + (node.turns / maxTurns) * 0.2

      result.push({ ...node, x, y, size, color, glowColor, brightness })
    }
  }

  return result
}

/** 判断节点是否与 highlightedId 相邻 */
function isAdjacent(node: LayoutNode, highlightedId: string | null, nodeMap: Map<string, LayoutNode>): boolean {
  if (!highlightedId) return false
  if (node.id === highlightedId) return true
  if (node.parentId === highlightedId) return true
  const highlighted = nodeMap.get(highlightedId)
  if (highlighted?.parentId === node.id) return true
  if (node.refs.includes(highlightedId)) return true
  if (highlighted?.refs.includes(node.id)) return true
  return false
}

/** 渲染一帧（带动画时间） */
function renderFrame(
  ctx: CanvasRenderingContext2D,
  nodes: LayoutNode[],
  width: number,
  height: number,
  highlightedId: string | null,
  time: number = 0,
) {
  const dpr = window.devicePixelRatio || 1
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  /* 背景渐变 */
  const grad = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.7)
  grad.addColorStop(0, '#2A2520')
  grad.addColorStop(1, '#1A1815')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, width, height)

  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  const hasHighlight = highlightedId !== null

  /* 画父子连线 */
  for (const node of nodes) {
    if (!node.parentId) continue
    const parent = nodeMap.get(node.parentId)
    if (!parent) continue

    const adjacent = hasHighlight && (
      isAdjacent(node, highlightedId, nodeMap) && isAdjacent(parent, highlightedId, nodeMap)
    )

    ctx.beginPath()
    ctx.moveTo(parent.x, parent.y)
    ctx.lineTo(node.x, node.y)
    ctx.strokeStyle = adjacent
      ? 'rgba(196,168,130,0.8)'
      : hasHighlight ? 'rgba(196,168,130,0.15)' : 'rgba(196,168,130,0.5)'
    ctx.lineWidth = adjacent ? 3 : parent.parentId === null ? 2.5 : 1.5
    ctx.shadowColor = adjacent ? 'rgba(196,168,130,0.5)' : 'rgba(196,168,130,0.25)'
    ctx.shadowBlur = adjacent ? 12 : 8
    ctx.stroke()
    ctx.shadowBlur = 0
  }

  /* 画跨分支引用虚线 */
  for (const node of nodes) {
    for (const refId of node.refs) {
      const ref = nodeMap.get(refId)
      if (!ref) continue

      const adjacent = hasHighlight && (
        isAdjacent(node, highlightedId, nodeMap) && isAdjacent(ref, highlightedId, nodeMap)
      )

      ctx.beginPath()
      ctx.moveTo(node.x, node.y)
      ctx.lineTo(ref.x, ref.y)
      ctx.strokeStyle = adjacent
        ? 'rgba(216,149,117,0.8)'
        : hasHighlight ? 'rgba(216,149,117,0.12)' : 'rgba(216,149,117,0.5)'
      ctx.lineWidth = adjacent ? 2 : 1.5
      ctx.setLineDash([6, 4])
      ctx.shadowColor = 'rgba(216,149,117,0.2)'
      ctx.shadowBlur = adjacent ? 10 : 6
      ctx.stroke()
      ctx.setLineDash([])
      ctx.shadowBlur = 0
    }
  }

  /* 画节点 */
  for (const node of nodes) {
    const isHighlighted = node.id === highlightedId
    const adjacent = isAdjacent(node, highlightedId, nodeMap)
    const dimmed = hasHighlight && !adjacent

    /* 呼吸脉冲：每个节点错开相位 */
    const pulse = Math.sin(time * 0.002 + node.x * 0.01 + node.y * 0.01) * 0.15 + 1
    const animatedSize = node.size * (isHighlighted ? 1.2 : pulse)

    /* 发光效果 */
    ctx.beginPath()
    ctx.arc(node.x, node.y, animatedSize, 0, Math.PI * 2)
    ctx.fillStyle = node.color
    ctx.globalAlpha = dimmed ? 0.25 : node.brightness
    ctx.shadowColor = node.glowColor
    ctx.shadowBlur = isHighlighted ? 35 : dimmed ? 4 : node.size + 8
    ctx.fill()
    ctx.shadowBlur = 0

    /* 高亮光环 */
    if (isHighlighted) {
      ctx.beginPath()
      ctx.arc(node.x, node.y, animatedSize + 4, 0, Math.PI * 2)
      ctx.strokeStyle = node.color
      ctx.lineWidth = 1.5
      ctx.globalAlpha = 0.4 + Math.sin(time * 0.005) * 0.2
      ctx.stroke()
    }

    ctx.globalAlpha = 1

    /* 节点标签 */
    ctx.font = `${node.parentId === null ? '600' : '500'} ${node.parentId === null ? 11 : 9}px Outfit, system-ui`
    ctx.fillStyle = node.color
    ctx.globalAlpha = dimmed ? 0.2 : node.status === 'archived' ? 0.5 : 0.8
    ctx.textAlign = 'left'
    ctx.fillText(node.label, node.x + animatedSize + 6, node.y + 4)
    ctx.globalAlpha = 1
  }
}

/** Tooltip 状态 */
interface TooltipState {
  visible: boolean
  x: number
  y: number
  node: LayoutNode | null
}

/** Topology 星空图页面 */
export function Topology() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nodesRef = useRef<LayoutNode[]>([])
  const [size, setSize] = useState({ width: 800, height: 600 })
  const [highlighted, setHighlighted] = useState<string | null>(null)
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, node: null })
  const [selectedNode, setSelectedNode] = useState<LayoutNode | null>(null)

  /* ResizeObserver */
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return
      const { width, height } = entry.contentRect
      if (width > 0 && height > 0) setSize({ width, height })
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  /* 布局计算 */
  useEffect(() => {
    const layout = computeLayout(mockNodes, size.width, size.height)
    nodesRef.current = layout
  }, [size])

  /* rAF 动画循环 */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = size.width * dpr
    canvas.height = size.height * dpr

    let rafId: number
    const loop = (time: number) => {
      renderFrame(ctx, nodesRef.current, size.width, size.height, highlighted, time)
      rafId = requestAnimationFrame(loop)
    }
    rafId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafId)
  }, [size, highlighted])

  /* 鼠标交互 */
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top

    const hit = nodesRef.current.find((n) => {
      const dx = n.x - mx
      const dy = n.y - my
      return dx * dx + dy * dy <= (n.size + 4) * (n.size + 4)
    })

    if (hit) {
      setHighlighted(hit.id)
      setTooltip({ visible: true, x: e.clientX, y: e.clientY, node: hit })
      canvas.style.cursor = 'pointer'
    } else {
      setHighlighted(null)
      setTooltip({ visible: false, x: 0, y: 0, node: null })
      canvas.style.cursor = 'default'
    }
  }, [])

  const handleClick = useCallback(() => {
    if (highlighted) {
      const node = nodesRef.current.find((n) => n.id === highlighted)
      setSelectedNode(node ?? null)
    } else {
      setSelectedNode(null)
    }
  }, [highlighted])

  return (
    <div className="flex h-full">
      {/* 星空图画布 */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block' }}
          onMouseMove={handleMouseMove}
          onClick={handleClick}
        />

        {/* 顶部标题栏 */}
        <div className="absolute top-5 left-6 flex items-center gap-3">
          <span className="text-base font-semibold text-[#E5E4E1]">Session Topology</span>
          <div className="flex items-center gap-1 bg-primary/15 rounded-full px-2.5 py-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-[11px] font-medium text-primary">{mockNodes.length} sessions</span>
          </div>
        </div>

        {/* 图例 */}
        <div className="absolute bottom-5 left-6 flex items-center gap-4">
          {[
            { color: '#C4A882', label: 'Main Session' },
            { color: '#B8956A', label: 'Active' },
            { color: '#A8C4A0', label: 'Leaf' },
            { color: '#D89575', label: 'Archived' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[10px] font-medium text-[#9C9B99]">{label}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0 border-t border-dashed border-[#D89575]" />
            <span className="text-[10px] font-medium text-[#9C9B99]">Cross-ref</span>
          </div>
        </div>

        {/* Tooltip */}
        {tooltip.visible && tooltip.node && (
          <div
            className="fixed z-50 pointer-events-none bg-[#2A2520]/95 backdrop-blur-sm rounded-lg border border-[#C4A88230] px-3 py-2 shadow-lg pop-enter"
            style={{ left: tooltip.x + 12, top: tooltip.y - 8 }}
          >
            <p className="text-xs font-semibold text-[#E5E4E1]">{tooltip.node.label}</p>
            <p className="text-[10px] text-[#9C9B99]">
              {tooltip.node.turns} turns · {tooltip.node.status}
            </p>
          </div>
        )}
      </div>

      {/* 右侧信息面板 */}
      {selectedNode && (
        <div className="w-72 bg-[#FFFFFF0F] backdrop-blur-md border-l border-[#FFFFFF15] flex flex-col p-5 gap-3.5 shrink-0 panel-enter">
          <h3 className="text-sm font-semibold text-[#E5E4E1]">
            Session: {selectedNode.label}
          </h3>
          <div className="h-px bg-[#FFFFFF15]" />

          {[
            { label: 'Status', value: selectedNode.status, color: selectedNode.status === 'active' ? '#C4793D' : '#9C9B99' },
            { label: 'Turns', value: String(selectedNode.turns), color: '#E5E4E1' },
            { label: 'L2 Memory', value: 'Available', color: '#C4793D' },
            { label: 'Children', value: selectedNode.children.length > 0 ? `${selectedNode.children.length} (${selectedNode.children.join(', ')})` : 'None', color: '#E5E4E1' },
            { label: 'Last Active', value: '2 min ago', color: '#E5E4E1' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-[#9C9B99]">{label}</span>
              <span className="text-[11px] font-medium" style={{ color }}>{value}</span>
            </div>
          ))}

          <div className="h-px bg-[#FFFFFF15]" />

          {/* 操作按钮 */}
          <div className="flex gap-2">
            <button className="flex items-center gap-1 px-3 py-1.5 bg-primary/20 rounded-md hover:bg-primary/30 transition-colors">
              <GitBranch size={12} className="text-primary" />
              <span className="text-[11px] font-medium text-primary">Fork</span>
            </button>
            <button className="flex items-center gap-1 px-3 py-1.5 bg-[#FFFFFF10] rounded-md hover:bg-[#FFFFFF20] transition-colors">
              <Archive size={12} className="text-[#9C9B99]" />
              <span className="text-[11px] font-medium text-[#9C9B99]">Archive</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
