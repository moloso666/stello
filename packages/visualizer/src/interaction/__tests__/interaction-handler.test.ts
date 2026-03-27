// ─── 交互处理器测试 ───

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InteractionHandler } from '../interaction-handler';
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
    onNodeDragStart: ReturnType<typeof vi.fn>;
    onNodeDragEnd: ReturnType<typeof vi.fn>;
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
      onNodeDragStart: vi.fn(),
      onNodeDragEnd: vi.fn(),
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

  it('mousedown + mousemove + mouseup 触发平移（点击空白区）', () => {
    handler.attach();
    // 在没有节点的位置拖拽
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
    // mousedown 在节点上 → 进入节点拖拽模式 → mouseup → onNodeDragEnd
    // 同时不会触发画布点击
    expect(callbacks.onNodeDragStart).toHaveBeenCalledWith('node1');
    expect(callbacks.onNodeDragEnd).toHaveBeenCalledWith('node1', 400, 300);
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

  // ─── 节点拖拽测试 ───

  it('点击在节点上开始节点拖拽（不触发画布平移）', () => {
    handler.attach();
    handler.updateNodes([makeNode()]);
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 400, clientY: 300 }));
    expect(callbacks.onNodeDragStart).toHaveBeenCalledWith('node1');
    // 不应该触发画布平移：offsetX/offsetY 应该还是 0
    const t = handler.getTransform();
    expect(t.offsetX).toBe(0);
    expect(t.offsetY).toBe(0);
  });

  it('拖拽节点更新 x/y 坐标', () => {
    handler.attach();
    const node = makeNode();
    handler.updateNodes([node]);
    // 在节点上按下
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 400, clientY: 300 }));
    // 拖动 50px
    canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: 450, clientY: 350 }));
    // 节点坐标应该更新（初始 400,300 + 位移 50,50）
    expect(node.x).toBe(450);
    expect(node.y).toBe(350);
  });

  it('松手后触发 onNodeDragEnd', () => {
    handler.attach();
    const node = makeNode();
    handler.updateNodes([node]);
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 400, clientY: 300 }));
    canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: 450, clientY: 350 }));
    canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: 450, clientY: 350 }));
    expect(callbacks.onNodeDragEnd).toHaveBeenCalledWith('node1', 450, 350);
  });

  it('点击空白区仍然是画布平移', () => {
    handler.attach();
    handler.updateNodes([makeNode()]);
    // 在远离节点的位置拖拽
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 50, clientY: 50 }));
    canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 80 }));
    canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: 100, clientY: 80 }));
    // 应该不触发节点拖拽
    expect(callbacks.onNodeDragStart).not.toHaveBeenCalled();
    // 应该触发画布平移
    expect(callbacks.onTransformChange).toHaveBeenCalled();
    const t = handler.getTransform();
    expect(t.offsetX).toBe(50);
    expect(t.offsetY).toBe(30);
  });

  it('getHighlightedNodeId 返回正在拖拽的节点 ID', () => {
    handler.attach();
    handler.updateNodes([makeNode()]);
    // 拖拽前无高亮
    expect(handler.getHighlightedNodeId()).toBeNull();
    // 开始拖拽
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: 400, clientY: 300 }));
    expect(handler.getHighlightedNodeId()).toBe('node1');
    // 松手后无高亮
    canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: 400, clientY: 300 }));
    expect(handler.getHighlightedNodeId()).toBeNull();
  });
});
