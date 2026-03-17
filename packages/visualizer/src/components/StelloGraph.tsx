// ─── StelloGraph React 组件 ───

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { StelloGraphProps, LayoutNode, ViewTransform } from '../types';
import { computeConstellationLayout } from '../layout/constellation';
import { renderFrame } from '../renderer/canvas-renderer';
import { InteractionHandler } from '../interaction/interaction-handler';
import { Tooltip } from './Tooltip';

/** Tooltip 状态 */
interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  label: string;
  memoryExcerpt?: string;
}

const INITIAL_TOOLTIP: TooltipState = { visible: false, x: 0, y: 0, label: '' };

/**
 * StelloGraph — 星空图 React 组件
 *
 * 将 Session 拓扑渲染为可交互的星空图。
 * 内部管理 Canvas、布局计算、渲染和交互。
 */
export const StelloGraph: React.FC<StelloGraphProps> = ({
  sessions,
  onSessionClick,
  memories,
  layoutConfig,
  renderConfig,
  className,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handlerRef = useRef<InteractionHandler | null>(null);
  const layoutRef = useRef<LayoutNode[]>([]);
  const transformRef = useRef<ViewTransform>({ offsetX: 0, offsetY: 0, scale: 1 });
  const rafRef = useRef<number>(0);

  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [tooltip, setTooltip] = useState<TooltipState>(INITIAL_TOOLTIP);

  /** 执行一帧渲染（rAF 防抖） */
  const scheduleRender = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      renderFrame(ctx, layoutRef.current, transformRef.current, renderConfig);
    });
  }, [renderConfig]);

  // Effect #1：初始化交互处理器
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handler = new InteractionHandler(canvas, {
      onNodeClick: (id) => onSessionClick?.(id),
      onNodeHover: (id, sx, sy) => {
        const mem = memories?.get(id);
        const node = layoutRef.current.find((n) => n.id === id);
        setTooltip({
          visible: true,
          x: sx,
          y: sy,
          label: node?.label ?? id,
          memoryExcerpt: mem ? mem.slice(0, 100) : undefined,
        });
      },
      onNodeLeave: () => setTooltip(INITIAL_TOOLTIP),
      onTransformChange: (t) => {
        transformRef.current = t;
        scheduleRender();
      },
    });
    handler.attach();
    handlerRef.current = handler;

    return () => {
      handler.detach();
      handlerRef.current = null;
    };
  }, [onSessionClick, memories, scheduleRender]);

  // Effect #2：ResizeObserver 监听容器尺寸
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        setCanvasSize({ width, height });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Effect #3：布局 + 渲染（sessions 或 canvasSize 变化时）
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const layout = computeConstellationLayout(sessions, {
      width: canvasSize.width,
      height: canvasSize.height,
      ...layoutConfig,
    });
    layoutRef.current = layout;
    handlerRef.current?.updateNodes(layout);

    // 设置 canvas DPI 尺寸
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvasSize.width * dpr;
    canvas.height = canvasSize.height * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderFrame(ctx, layout, transformRef.current, renderConfig);
  }, [sessions, canvasSize, layoutConfig, renderConfig]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
      <Tooltip {...tooltip} />
    </div>
  );
};
