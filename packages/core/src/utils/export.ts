// ─── Visualizer 数据转换辅助 ───

import type { SessionMeta, TopologyNode } from '../types/session';

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

/** 将 TopologyNode + SessionMeta 合并为 visualizer 可消费的格式 */
export function toVisualizerFormat(
  nodes: TopologyNode[],
  sessions: SessionMeta[],
): VisualizerNode[] {
  const sessionMap = new Map(sessions.map((s) => [s.id, s]));
  return nodes
    .map((n) => {
      const s = sessionMap.get(n.id);
      if (!s) return null;
      return {
        id: n.id,
        parentId: n.parentId,
        label: n.label,
        depth: n.depth,
        turnCount: s.turnCount,
        status: s.status,
        children: n.children,
        refs: n.refs,
        lastActiveAt: s.lastActiveAt,
      };
    })
    .filter((v): v is VisualizerNode => v !== null);
}
