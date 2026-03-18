// ─── Visualizer 数据转换辅助 ───

import type { SessionMeta } from '../types/session';

/** visualizer 需要的节点格式 */
export interface VisualizerNode {
  id: string;
  parentId: string | null;
  label: string;
  depth: number;
  turnCount: number;
  status: 'active' | 'archived';
  children: string[];
  refs: string[];
  lastActiveAt: string;
}

/** 将 SessionMeta 数组转换为 visualizer 可直接消费的格式 */
export function toVisualizerFormat(sessions: SessionMeta[]): VisualizerNode[] {
  return sessions.map((s) => ({
    id: s.id,
    parentId: s.parentId,
    label: s.label,
    depth: s.depth,
    turnCount: s.turnCount,
    status: s.status,
    children: s.children,
    refs: s.refs,
    lastActiveAt: s.lastActiveAt,
  }));
}
