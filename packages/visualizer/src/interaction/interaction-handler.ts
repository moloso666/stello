// ─── 交互处理器 ───

import type { LayoutNode, ViewTransform } from '../types';
import { screenToCanvas, distance, clamp } from '../utils/math';

/** 交互事件回调 */
export interface InteractionCallbacks {
  /** 点击节点 */
  onNodeClick?: (nodeId: string) => void;
  /** 悬浮进入节点 */
  onNodeHover?: (nodeId: string, screenX: number, screenY: number) => void;
  /** 悬浮离开节点 */
  onNodeLeave?: () => void;
  /** 视图变换改变（缩放/平移后） */
  onTransformChange?: (transform: ViewTransform) => void;
  /** 开始拖拽节点 */
  onNodeDragStart?: (nodeId: string) => void;
  /** 结束拖拽节点 */
  onNodeDragEnd?: (nodeId: string, x: number, y: number) => void;
}

/** 缩放范围 */
const MIN_SCALE = 0.1;
const MAX_SCALE = 5;
/** 判断点击的最大位移阈值（像素） */
const CLICK_THRESHOLD = 3;

/**
 * 交互处理器
 *
 * 管理 Canvas 的缩放、平移、节点拖拽、点击、悬浮事件。
 */
export class InteractionHandler {
  private transform: ViewTransform = { offsetX: 0, offsetY: 0, scale: 1 };
  private nodes: LayoutNode[] = [];
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragTotalDist = 0;
  private hoveredId: string | null = null;

  /** 正在拖拽的节点 */
  private draggedNode: LayoutNode | null = null;
  /** 鼠标到节点中心的偏移 */
  private nodeOffsetX = 0;
  private nodeOffsetY = 0;
  /** 当前高亮节点 ID（拖拽中） */
  private highlightedId: string | null = null;

  /** 绑定的事件处理函数（用于 detach） */
  private readonly handleWheel: (e: WheelEvent) => void;
  private readonly handleMouseDown: (e: MouseEvent) => void;
  private readonly handleMouseMove: (e: MouseEvent) => void;
  private readonly handleMouseUp: (e: MouseEvent) => void;
  private readonly handleMouseLeave: () => void;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly callbacks: InteractionCallbacks,
  ) {
    this.handleWheel = this.onWheel.bind(this);
    this.handleMouseDown = this.onMouseDown.bind(this);
    this.handleMouseMove = this.onMouseMove.bind(this);
    this.handleMouseUp = this.onMouseUp.bind(this);
    this.handleMouseLeave = this.onMouseLeaveEvt.bind(this);
  }

  /** 绑定所有事件监听 */
  attach(): void {
    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave);
  }

  /** 解绑所有事件监听 */
  detach(): void {
    this.canvas.removeEventListener('wheel', this.handleWheel);
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave);
  }

  /** 更新节点数据（布局变化后调用） */
  updateNodes(nodes: LayoutNode[]): void {
    this.nodes = nodes;
  }

  /** 获取当前 transform */
  getTransform(): ViewTransform {
    return { ...this.transform };
  }

  /** 重置视图到初始状态 */
  resetTransform(): void {
    this.transform = { offsetX: 0, offsetY: 0, scale: 1 };
    this.callbacks.onTransformChange?.(this.getTransform());
  }

  /** 获取当前高亮节点 ID（拖拽中的节点） */
  getHighlightedNodeId(): string | null {
    return this.highlightedId;
  }

  /** 获取鼠标相对于 canvas 的坐标 */
  private getCanvasPoint(e: MouseEvent): { sx: number; sy: number } {
    const rect = this.canvas.getBoundingClientRect();
    return { sx: e.clientX - rect.left, sy: e.clientY - rect.top };
  }

  /** 命中检测：找到鼠标下的节点 */
  private hitTest(screenX: number, screenY: number): LayoutNode | null {
    const { x, y } = screenToCanvas(screenX, screenY, this.transform);
    // 从后往前遍历（视觉上后绘制的在上层）
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const node = this.nodes[i]!;
      if (distance(x, y, node.x, node.y) <= node.size) {
        return node;
      }
    }
    return null;
  }

  /** 滚轮缩放 */
  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const { sx, sy } = this.getCanvasPoint(e);
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = clamp(this.transform.scale * factor, MIN_SCALE, MAX_SCALE);
    // 以鼠标为中心缩放
    const ratio = newScale / this.transform.scale;
    this.transform.offsetX = sx - (sx - this.transform.offsetX) * ratio;
    this.transform.offsetY = sy - (sy - this.transform.offsetY) * ratio;
    this.transform.scale = newScale;
    this.callbacks.onTransformChange?.(this.getTransform());
  }

  /** 按下鼠标：区分拖节点 vs 拖画布 */
  private onMouseDown(e: MouseEvent): void {
    const { sx, sy } = this.getCanvasPoint(e);
    const hit = this.hitTest(sx, sy);

    if (hit) {
      // 命中节点 → 开始节点拖拽
      this.draggedNode = hit;
      const canvasPos = screenToCanvas(sx, sy, this.transform);
      this.nodeOffsetX = canvasPos.x - hit.x;
      this.nodeOffsetY = canvasPos.y - hit.y;
      this.highlightedId = hit.id;
      this.callbacks.onNodeDragStart?.(hit.id);
      // 触发重渲染以显示高亮
      this.callbacks.onTransformChange?.(this.getTransform());
    } else {
      // 未命中 → 画布拖拽
      this.isDragging = true;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.dragTotalDist = 0;
    }
  }

  /** 鼠标移动：节点拖拽或画布平移或悬浮检测 */
  private onMouseMove(e: MouseEvent): void {
    // 节点拖拽
    if (this.draggedNode) {
      const { sx, sy } = this.getCanvasPoint(e);
      const canvasPos = screenToCanvas(sx, sy, this.transform);
      this.draggedNode.x = canvasPos.x - this.nodeOffsetX;
      this.draggedNode.y = canvasPos.y - this.nodeOffsetY;
      this.callbacks.onTransformChange?.(this.getTransform());
      return;
    }

    // 画布平移
    if (this.isDragging) {
      const dx = e.clientX - this.dragStartX;
      const dy = e.clientY - this.dragStartY;
      this.dragTotalDist += Math.abs(dx) + Math.abs(dy);
      this.transform.offsetX += dx;
      this.transform.offsetY += dy;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.callbacks.onTransformChange?.(this.getTransform());
      return;
    }

    // 悬浮检测
    const { sx, sy } = this.getCanvasPoint(e);
    const hit = this.hitTest(sx, sy);
    if (hit) {
      if (this.hoveredId !== hit.id) {
        this.hoveredId = hit.id;
        this.callbacks.onNodeHover?.(hit.id, sx, sy);
      }
    } else if (this.hoveredId) {
      this.hoveredId = null;
      this.callbacks.onNodeLeave?.();
    }
  }

  /** 松开鼠标：结束拖拽或检测点击 */
  private onMouseUp(e: MouseEvent): void {
    // 结束节点拖拽
    if (this.draggedNode) {
      const node = this.draggedNode;
      this.callbacks.onNodeDragEnd?.(node.id, node.x, node.y);
      this.draggedNode = null;
      this.highlightedId = null;
      // 触发重渲染以移除高亮
      this.callbacks.onTransformChange?.(this.getTransform());
      return;
    }

    // 画布拖拽结束 / 点击检测
    const wasDragging = this.isDragging;
    this.isDragging = false;
    // 位移很小视为点击
    if (wasDragging && this.dragTotalDist < CLICK_THRESHOLD) {
      const { sx, sy } = this.getCanvasPoint(e);
      const hit = this.hitTest(sx, sy);
      if (hit) {
        this.callbacks.onNodeClick?.(hit.id);
      }
    }
  }

  /** 鼠标离开 canvas */
  private onMouseLeaveEvt(): void {
    this.isDragging = false;
    if (this.draggedNode) {
      const node = this.draggedNode;
      this.callbacks.onNodeDragEnd?.(node.id, node.x, node.y);
      this.draggedNode = null;
      this.highlightedId = null;
    }
    if (this.hoveredId) {
      this.hoveredId = null;
      this.callbacks.onNodeLeave?.();
    }
  }
}
