// ─── Canvas 渲染器 ───

import type { LayoutNode, ViewTransform, RenderConfig } from '../types';
import { applyBrightness } from '../utils/math';

/** 渲染配置默认值 */
const DEFAULTS: Required<
  Omit<RenderConfig, 'backgroundGradient' | 'nodeGlowBlur' | 'highlightGlowBlur'>
> & { backgroundGradient?: [string, string]; nodeGlowBlur: number; highlightGlowBlur: number } = {
  parentLineColor: 'rgba(255,255,255,0.2)',
  refLineColor: 'rgba(255,255,255,0.1)',
  lineWidth: 1,
  refLineDash: [4, 4],
  showLabels: true,
  labelFont: '12px sans-serif',
  labelColor: 'rgba(255,255,255,0.7)',
  backgroundColor: '#0a0a1a',
  backgroundGradient: ['#0a0a1a', '#1a1a2e'],
  nodeGlowBlur: 8,
  highlightGlowBlur: 20,
};

/** 渲染所有内容到 canvas */
export function renderFrame(
  ctx: CanvasRenderingContext2D,
  nodes: LayoutNode[],
  transform: ViewTransform,
  config?: Partial<RenderConfig>,
  highlightedNodeId?: string | null,
): void {
  const c = { ...DEFAULTS, ...config };
  const { width, height } = ctx.canvas;
  const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;

  // 清空画布（渐变或纯色）
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (c.backgroundGradient) {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, c.backgroundGradient[0]);
    grad.addColorStop(1, c.backgroundGradient[1]);
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = c.backgroundColor;
  }
  ctx.fillRect(0, 0, width, height);
  ctx.restore();

  // 应用视图变换
  ctx.save();
  ctx.translate(transform.offsetX * dpr, transform.offsetY * dpr);
  ctx.scale(transform.scale * dpr, transform.scale * dpr);

  // 构建索引
  const nodeMap = new Map<string, LayoutNode>();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }

  // 绘制父子连线（实线）
  ctx.lineWidth = c.lineWidth;
  ctx.setLineDash([]);
  for (const node of nodes) {
    if (!node.parentId) continue;
    const parent = nodeMap.get(node.parentId);
    if (!parent) continue;
    ctx.globalAlpha = Math.min(node.opacity, parent.opacity);
    ctx.strokeStyle = c.parentLineColor;
    ctx.beginPath();
    ctx.moveTo(parent.x, parent.y);
    ctx.lineTo(node.x, node.y);
    ctx.stroke();
  }

  // 绘制引用连线（虚线）
  ctx.setLineDash(c.refLineDash);
  for (const node of nodes) {
    for (const refId of node.refs) {
      const ref = nodeMap.get(refId);
      if (!ref) continue;
      ctx.globalAlpha = Math.min(node.opacity, ref.opacity);
      ctx.strokeStyle = c.refLineColor;
      ctx.beginPath();
      ctx.moveTo(node.x, node.y);
      ctx.lineTo(ref.x, ref.y);
      ctx.stroke();
    }
  }
  ctx.setLineDash([]);

  // 绘制节点（带发光效果）
  for (const node of nodes) {
    ctx.globalAlpha = node.opacity;
    const fillColor = node.color.startsWith('#')
      ? applyBrightness(node.color, node.brightness)
      : node.color;

    // 发光效果
    const isHighlighted = highlightedNodeId === node.id;
    ctx.shadowColor = node.color + '80';
    ctx.shadowBlur = isHighlighted ? c.highlightGlowBlur : c.nodeGlowBlur;

    ctx.fillStyle = fillColor;
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
    ctx.fill();

    // 重置 shadow 避免影响后续绘制
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }

  // 绘制标签
  if (c.showLabels) {
    ctx.font = c.labelFont;
    ctx.textAlign = 'center';
    ctx.fillStyle = c.labelColor;
    for (const node of nodes) {
      ctx.globalAlpha = node.opacity;
      ctx.fillText(node.label, node.x, node.y + node.size + 14);
    }
  }

  ctx.restore();
}
