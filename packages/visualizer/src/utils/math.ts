// ─── 数学工具函数 ───

import type { ViewTransform } from '../types';

/** 线性插值：将 value 从 [inMin, inMax] 映射到 [outMin, outMax] */
export function lerp(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  if (inMax === inMin) return outMin;
  const t = (value - inMin) / (inMax - inMin);
  return outMin + t * (outMax - outMin);
}

/** 限制数值在 [min, max] 范围内 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** 计算两点间距离 */
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/** 将屏幕坐标转换为画布坐标（考虑 transform） */
export function screenToCanvas(
  screenX: number,
  screenY: number,
  transform: ViewTransform,
): { x: number; y: number } {
  return {
    x: (screenX - transform.offsetX) / transform.scale,
    y: (screenY - transform.offsetY) / transform.scale,
  };
}

/** 计算 ISO 时间戳距离当前时间的毫秒数 */
export function msAgo(isoString: string): number {
  return Math.max(0, Date.now() - new Date(isoString).getTime());
}

/** 将 hex 颜色按 brightness 调整亮度（与白色混合） */
export function applyBrightness(hexColor: string, brightness: number): string {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const mix = (c: number) => Math.round(c * brightness + 255 * (1 - brightness) * 0.3);
  return `rgb(${clamp(mix(r), 0, 255)}, ${clamp(mix(g), 0, 255)}, ${clamp(mix(b), 0, 255)})`;
}
