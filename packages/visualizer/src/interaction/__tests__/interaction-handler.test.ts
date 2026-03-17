// ─── 交互处理器测试 ───

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InteractionHandler } from '../interaction-handler';
import type { InteractionCallbacks } from '../interaction-handler';
import type { LayoutNode } from '../../types';

function makeNode(overrides: Partial<LayoutNode> = {}): LayoutNode {
  return {
    id: 'node1',
    x: 400,
    y: 300,
    size: 20,
    brightness: 1,
    color: '#7EC8E3',
    opacity: 1,
    parentId: null,
    refs: [],
    label: '测试',
    ...overrides,
  };
}

describe('InteractionHandler — 交互处理器', () => {
  let canvas: HTMLCanvasElement;
  let callbacks: {
    onNodeClick: ReturnType<typeof vi.fn>;
    onNodeHover: ReturnType<typeof vi.fn>;
    onNodeLeave: ReturnType<typeof vi.fn>;
    onTransformChange: ReturnType<typeof vi.fn>;
  };
  let handler: InteractionHandler;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    // jsdom 中 getBoundingClientRect 默认返回全零，手动 mock
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      left: 0, top: 0, right: 800, bottom: 600,
      width: 800, height: 600, x: 0, y: 0, toJSON: () => ({}),
    });
    callbacks = {
      onNodeClick: vi.fn(),
      onNodeHover: vi.fn(),
      onNodeLeave: vi.fn(),
      onTransformChange: vi.fn(),
    };
    handler = new InteractionHandler(canvas, callbacks);
  });

  afterEach(() => {
    handler.detach();
    vi.restoreAllMocks();
  });

  it('attach/detach 不报错', () => {
    expect(() => handler.attach()).not.toThrow();
    expect(() => handler.detach()).not.toThrow();
  });

  it('wheel 事件触发 onTransformChange', () => {
    handler.attach();
    canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, clientX: 400, clientY: 300 }));
    expect(callbacks.onTransformChange).toHaveBeenCalled();
    const transform = callbacks.onTransformChange.mock.calls[0]![0]!;
    expect(transform.scale).toBeGreaterThan(1); // 向上滚 = 放大
  });

  it('mousedown + mousemove + mouseup 触发平移', () => {
    handler.attach();
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 100, clientY: 100 }));
    canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: 150, clientY: 120 }));
    canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: 150, clientY: 120 }));
    expect(callbacks.onTransformChange).toHaveBeenCalled();
    const transform = callbacks.onTransformChange.mock.calls[0]![0]!;
    expect(transform.offsetX).toBe(50);
    expect(transform.offsetY).toBe(20);
  });

  it('小位移 click 触发 onNodeClick', () => {
    handler.attach();
    // 节点在 (400, 300)，size=20，transform 默认 offset=0, scale=1
    handler.updateNodes([makeNode()]);
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 400, clientY: 300 }));
    canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: 400, clientY: 300 }));
    expect(callbacks.onNodeClick).toHaveBeenCalledWith('node1');
  });

  it('mousemove 命中节点触发 onNodeHover', () => {
    handler.attach();
    handler.updateNodes([makeNode()]);
    canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: 400, clientY: 300 }));
    expect(callbacks.onNodeHover).toHaveBeenCalledWith('node1', 400, 300);
  });

  it('mousemove 离开节点触发 onNodeLeave', () => {
    handler.attach();
    handler.updateNodes([makeNode()]);
    // 先进入
    canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: 400, clientY: 300 }));
    // 再移开
    canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: 0, clientY: 0 }));
    expect(callbacks.onNodeLeave).toHaveBeenCalled();
  });

  it('detach 后不再响应事件', () => {
    handler.attach();
    handler.detach();
    canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -100 }));
    expect(callbacks.onTransformChange).not.toHaveBeenCalled();
  });

  it('resetTransform 恢复初始状态', () => {
    handler.attach();
    canvas.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, clientX: 400, clientY: 300 }));
    handler.resetTransform();
    const t = handler.getTransform();
    expect(t.scale).toBe(1);
    expect(t.offsetX).toBe(0);
    expect(t.offsetY).toBe(0);
  });
});
