// ─── Canvas 渲染器测试 ───

import { describe, it, expect, vi } from 'vitest';
import { renderFrame } from '../canvas-renderer';
import type { LayoutNode, ViewTransform } from '../../types';

/** 创建 mock CanvasRenderingContext2D */
function createMockCtx(): CanvasRenderingContext2D {
  const gradientMock = { addColorStop: vi.fn() };
  const ctx: Record<string, unknown> = {
    canvas: { width: 800, height: 600 },
    save: vi.fn(),
    restore: vi.fn(),
    setTransform: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    fillText: vi.fn(),
    setLineDash: vi.fn(),
    createLinearGradient: vi.fn(() => gradientMock),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    globalAlpha: 1,
    font: '',
    textAlign: '',
    shadowColor: '',
    shadowBlur: 0,
  };
  return ctx as unknown as CanvasRenderingContext2D;
}

const defaultTransform: ViewTransform = { offsetX: 0, offsetY: 0, scale: 1 };

function makeNode(overrides: Partial<LayoutNode> = {}): LayoutNode {
  return {
    id: 'node1',
    x: 400,
    y: 300,
    size: 10,
    brightness: 1,
    color: '#7EC8E3',
    opacity: 1,
    parentId: null,
    refs: [],
    label: '测试',
    ...overrides,
  };
}

describe('renderFrame — Canvas 渲染', () => {
  it('空节点列表不报错', () => {
    const ctx = createMockCtx();
    expect(() => renderFrame(ctx, [], defaultTransform)).not.toThrow();
    expect(ctx.fillRect).toHaveBeenCalled(); // 背景清空
  });

  it('单节点——调用了 arc + fill', () => {
    const ctx = createMockCtx();
    renderFrame(ctx, [makeNode()], defaultTransform);
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it('父子连线——调用了 moveTo + lineTo + stroke', () => {
    const ctx = createMockCtx();
    const parent = makeNode({ id: 'p', x: 100, y: 100 });
    const child = makeNode({ id: 'c', x: 200, y: 200, parentId: 'p' });
    renderFrame(ctx, [parent, child], defaultTransform);
    expect(ctx.moveTo).toHaveBeenCalled();
    expect(ctx.lineTo).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('refs 连线——调用了 setLineDash（虚线）', () => {
    const ctx = createMockCtx();
    const a = makeNode({ id: 'a', x: 100, y: 100, refs: ['b'] });
    const b = makeNode({ id: 'b', x: 200, y: 200 });
    renderFrame(ctx, [a, b], defaultTransform);
    // setLineDash 被调用时含非空数组（虚线）
    const calls = (ctx.setLineDash as ReturnType<typeof vi.fn>).mock.calls;
    const hasDash = calls.some(
      (call: unknown[]) => Array.isArray(call[0]) && (call[0] as number[]).length > 0,
    );
    expect(hasDash).toBe(true);
  });

  it('transform 被正确应用——调用了 translate + scale', () => {
    const ctx = createMockCtx();
    renderFrame(ctx, [makeNode()], { offsetX: 50, offsetY: 30, scale: 2 });
    expect(ctx.translate).toHaveBeenCalled();
    expect(ctx.scale).toHaveBeenCalled();
  });

  it('showLabels=false 时不调用 fillText', () => {
    const ctx = createMockCtx();
    renderFrame(ctx, [makeNode()], defaultTransform, { showLabels: false });
    expect(ctx.fillText).not.toHaveBeenCalled();
  });
});
