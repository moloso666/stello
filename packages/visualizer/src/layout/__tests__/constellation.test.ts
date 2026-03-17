// ─── 星图布局算法测试 ───

import { describe, it, expect } from 'vitest';
import { computeConstellationLayout } from '../constellation';
import type { SessionData } from '../../types';

/** 创建测试用 SessionData */
function makeSession(overrides: Partial<SessionData> = {}): SessionData {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    parentId: null,
    children: [],
    refs: [],
    label: '测试',
    index: 0,
    status: 'active',
    depth: 0,
    turnCount: 1,
    lastActiveAt: new Date().toISOString(),
    ...overrides,
  };
}

const defaultConfig = { width: 800, height: 600 };

describe('computeConstellationLayout — 星图布局算法', () => {
  it('空数组返回空数组', () => {
    expect(computeConstellationLayout([], defaultConfig)).toEqual([]);
  });

  it('单个根节点放在画布中心', () => {
    const root = makeSession({ depth: 0 });
    const [node] = computeConstellationLayout([root], defaultConfig);
    expect(node!.x).toBe(400);
    expect(node!.y).toBe(300);
    expect(node!.parentId).toBeNull();
  });

  it('根 + 2 个子节点——子节点在第一环上', () => {
    const rootId = 'root';
    const sessions = [
      makeSession({ id: rootId, depth: 0 }),
      makeSession({ id: 'c1', parentId: rootId, depth: 1, index: 0 }),
      makeSession({ id: 'c2', parentId: rootId, depth: 1, index: 1 }),
    ];
    const nodes = computeConstellationLayout(sessions, defaultConfig);
    const root = nodes.find((n) => n.id === rootId)!;
    const c1 = nodes.find((n) => n.id === 'c1')!;
    const c2 = nodes.find((n) => n.id === 'c2')!;
    // 根在中心
    expect(root.x).toBe(400);
    expect(root.y).toBe(300);
    // 子节点在环上，距离中心 = ringSpacing (默认 100)
    const d1 = Math.sqrt((c1.x - 400) ** 2 + (c1.y - 300) ** 2);
    const d2 = Math.sqrt((c2.x - 400) ** 2 + (c2.y - 300) ** 2);
    expect(d1).toBeCloseTo(100, 0);
    expect(d2).toBeCloseTo(100, 0);
  });

  it('三层树——每层在不同环距上', () => {
    const sessions = [
      makeSession({ id: 'r', depth: 0 }),
      makeSession({ id: 'c', parentId: 'r', depth: 1, index: 0 }),
      makeSession({ id: 'gc', parentId: 'c', depth: 2, index: 0 }),
    ];
    const nodes = computeConstellationLayout(sessions, { ...defaultConfig, ringSpacing: 80 });
    const c = nodes.find((n) => n.id === 'c')!;
    const gc = nodes.find((n) => n.id === 'gc')!;
    const dC = Math.sqrt((c.x - 400) ** 2 + (c.y - 300) ** 2);
    const dGC = Math.sqrt((gc.x - 400) ** 2 + (gc.y - 300) ** 2);
    expect(dC).toBeCloseTo(80, 0);
    expect(dGC).toBeCloseTo(160, 0);
  });

  it('turnCount 越大 size 越大', () => {
    const sessions = [
      makeSession({ id: 'a', turnCount: 1, depth: 0 }),
      makeSession({ id: 'b', parentId: 'a', turnCount: 10, depth: 1, index: 0 }),
    ];
    const nodes = computeConstellationLayout(sessions, defaultConfig);
    const a = nodes.find((n) => n.id === 'a')!;
    const b = nodes.find((n) => n.id === 'b')!;
    expect(b.size).toBeGreaterThan(a.size);
  });

  it('lastActiveAt 越近 brightness 越高', () => {
    const now = new Date();
    const old = new Date(now.getTime() - 1000 * 60 * 60 * 24);
    const sessions = [
      makeSession({ id: 'recent', lastActiveAt: now.toISOString(), depth: 0 }),
      makeSession({ id: 'old', lastActiveAt: old.toISOString(), depth: 1, index: 0 }),
    ];
    const nodes = computeConstellationLayout(sessions, defaultConfig);
    const recent = nodes.find((n) => n.id === 'recent')!;
    const oldNode = nodes.find((n) => n.id === 'old')!;
    expect(recent.brightness).toBeGreaterThan(oldNode.brightness);
  });

  it('归档节点 opacity 为 archivedOpacity', () => {
    const sessions = [
      makeSession({ id: 'a', status: 'active', depth: 0 }),
      makeSession({ id: 'b', status: 'archived', depth: 1, index: 0 }),
    ];
    const nodes = computeConstellationLayout(sessions, { ...defaultConfig, archivedOpacity: 0.2 });
    expect(nodes.find((n) => n.id === 'a')!.opacity).toBe(1);
    expect(nodes.find((n) => n.id === 'b')!.opacity).toBe(0.2);
  });

  it('自定义 colorFn 正确应用', () => {
    const sessions = [makeSession({ id: 'x', depth: 0 })];
    const nodes = computeConstellationLayout(sessions, {
      ...defaultConfig,
      colorFn: () => '#FF0000',
    });
    expect(nodes[0]!.color).toBe('#FF0000');
  });

  it('不传 colorFn 时使用 defaultColor', () => {
    const sessions = [makeSession({ id: 'x', depth: 0 })];
    const nodes = computeConstellationLayout(sessions, {
      ...defaultConfig,
      defaultColor: '#123456',
    });
    expect(nodes[0]!.color).toBe('#123456');
  });

  it('同层多节点角度不重叠', () => {
    const rootId = 'root';
    const children = Array.from({ length: 5 }, (_, i) =>
      makeSession({ id: `c${i}`, parentId: rootId, depth: 1, index: i }),
    );
    const sessions = [makeSession({ id: rootId, depth: 0 }), ...children];
    const nodes = computeConstellationLayout(sessions, defaultConfig);
    const childNodes = nodes.filter((n) => n.parentId === rootId);
    // 所有子节点坐标两两不同
    for (let i = 0; i < childNodes.length; i++) {
      for (let j = i + 1; j < childNodes.length; j++) {
        const a = childNodes[i]!;
        const b = childNodes[j]!;
        expect(Math.abs(a.x - b.x) + Math.abs(a.y - b.y)).toBeGreaterThan(1);
      }
    }
  });

  it('refs 正确传递到 LayoutNode', () => {
    const sessions = [
      makeSession({ id: 'a', refs: ['b', 'c'], depth: 0 }),
    ];
    const nodes = computeConstellationLayout(sessions, defaultConfig);
    expect(nodes[0]!.refs).toEqual(['b', 'c']);
  });

  it('自定义 minNodeSize / maxNodeSize', () => {
    const sessions = [
      makeSession({ id: 'a', turnCount: 0, depth: 0 }),
      makeSession({ id: 'b', turnCount: 100, depth: 1, index: 0 }),
    ];
    const nodes = computeConstellationLayout(sessions, {
      ...defaultConfig,
      minNodeSize: 10,
      maxNodeSize: 50,
    });
    const a = nodes.find((n) => n.id === 'a')!;
    const b = nodes.find((n) => n.id === 'b')!;
    expect(a.size).toBe(10);
    expect(b.size).toBe(50);
  });

  it('返回结果数量与输入一致', () => {
    const sessions = Array.from({ length: 8 }, (_, i) =>
      makeSession({ id: `s${i}`, depth: i < 1 ? 0 : 1, index: i }),
    );
    const nodes = computeConstellationLayout(sessions, defaultConfig);
    expect(nodes).toHaveLength(8);
  });
});
