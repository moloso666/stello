// ─── 星图布局算法 ───

import type { SessionData, LayoutNode, LayoutConfig } from '../types';
import { lerp, clamp, msAgo } from '../utils/math';

/** 黄金角（弧度），使同层节点分布更自然 */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/** 布局配置默认值 */
const DEFAULTS = {
  width: 800,
  height: 600,
  ringSpacing: 100,
  minNodeSize: 4,
  maxNodeSize: 24,
  archivedOpacity: 0.3,
  defaultColor: '#7EC8E3',
} as const;

/**
 * 星图布局算法
 *
 * 输入 SessionData[]，输出每个节点的画布坐标和视觉属性。
 * 根节点居中，子节点按 depth 向外扩展为同心环。
 */
export function computeConstellationLayout(
  sessions: SessionData[],
  config?: Partial<LayoutConfig>,
): LayoutNode[] {
  if (sessions.length === 0) return [];

  const c = { ...DEFAULTS, ...config };
  const centerX = c.width / 2;
  const centerY = c.height / 2;

  // 构建索引 + 计算全局范围
  const maxTurnCount = Math.max(1, ...sessions.map((s) => s.turnCount));
  const allMsAgo = sessions.map((s) => msAgo(s.lastActiveAt));
  const maxMsAgo = Math.max(1, ...allMsAgo);

  // 按 depth 分组
  const depthGroups = new Map<number, SessionData[]>();
  for (const s of sessions) {
    const group = depthGroups.get(s.depth) ?? [];
    group.push(s);
    depthGroups.set(s.depth, group);
  }

  // 每组按 index 排序
  for (const group of depthGroups.values()) {
    group.sort((a, b) => a.index - b.index);
  }

  const results: LayoutNode[] = [];

  for (const [depth, group] of depthGroups) {
    const count = group.length;

    for (let i = 0; i < count; i++) {
      const session = group[i]!;
      let x: number;
      let y: number;

      if (depth === 0) {
        // 根节点放在画布中心
        x = centerX;
        y = centerY;
      } else {
        const radius = depth * c.ringSpacing;
        // 使用黄金角分布，同层多个节点时更均匀
        const angle = count === 1 ? 0 : i * ((2 * Math.PI) / count) + depth * GOLDEN_ANGLE;
        x = centerX + radius * Math.cos(angle);
        y = centerY + radius * Math.sin(angle);
      }

      const sessionMsAgo = msAgo(session.lastActiveAt);
      const size = lerp(session.turnCount, 0, maxTurnCount, c.minNodeSize, c.maxNodeSize);
      const brightness = clamp(1 - lerp(sessionMsAgo, 0, maxMsAgo, 0, 0.7), 0.3, 1);
      const color = c.colorFn ? c.colorFn(session) : c.defaultColor;
      const opacity = session.status === 'archived' ? c.archivedOpacity : 1;

      results.push({
        id: session.id,
        x,
        y,
        size,
        brightness,
        color,
        opacity,
        parentId: session.parentId,
        refs: session.refs,
        label: session.label,
      });
    }
  }

  return results;
}
