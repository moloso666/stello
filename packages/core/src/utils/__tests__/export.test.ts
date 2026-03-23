import { describe, it, expect } from 'vitest';
import { toVisualizerFormat } from '../export';
import type { SessionMeta, TopologyNode } from '../../types/session';

/** 构造最小 SessionMeta */
function makeMeta(overrides: Partial<SessionMeta> = {}): SessionMeta {
  return {
    id: 'test-id',
    label: 'Test',
    scope: null,
    status: 'active',
    turnCount: 3,
    metadata: { custom: true },
    tags: ['tag1'],
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    lastActiveAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

/** 构造最小 TopologyNode */
function makeNode(overrides: Partial<TopologyNode> = {}): TopologyNode {
  return {
    id: 'test-id',
    parentId: null,
    children: [],
    refs: [],
    depth: 0,
    index: 0,
    label: 'Test',
    ...overrides,
  };
}

describe('toVisualizerFormat', () => {
  it('正确映射字段，排除 visualizer 不需要的字段', () => {
    const nodes = [makeNode({ id: 'root', children: ['child-1'] })];
    const sessions = [makeMeta({ id: 'root', turnCount: 5 })];
    const result = toVisualizerFormat(nodes, sessions);
    expect(result).toEqual([
      {
        id: 'root',
        parentId: null,
        label: 'Test',
        depth: 0,
        turnCount: 5,
        status: 'active',
        children: ['child-1'],
        refs: [],
        lastActiveAt: '2026-01-01T00:00:00Z',
      },
    ]);
    // 不应包含 metadata、tags、createdAt 等
    expect(result[0]).not.toHaveProperty('metadata');
    expect(result[0]).not.toHaveProperty('tags');
    expect(result[0]).not.toHaveProperty('createdAt');
  });

  it('空数组返回空数组', () => {
    expect(toVisualizerFormat([], [])).toEqual([]);
  });
});
