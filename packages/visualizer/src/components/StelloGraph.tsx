// ─── StelloGraph React 组件 ───

import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { StelloGraphProps, LayoutNode, ViewTransform } from '../types';
import { computeConstellationLayout } from '../layout/constellation';
import { renderFrame } from '../renderer/canvas-renderer';
import { InteractionHandler } from '../interaction/interaction-handler';
import { Tooltip } from './Tooltip';
import { ChatPanel } from './ChatPanel';
import { FilePanel } from './FilePanel';
import { theme } from '../styles/theme';

/** Tooltip 状态 */
interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  label: string;
  memoryExcerpt?: string;
}

const INITIAL_TOOLTIP: TooltipState = { visible: false, x: 0, y: 0, label: '' };

/** Tab 切换器（内联子组件） */
const TabSwitcher: React.FC<{
  activeTab: 'chat' | 'files';
  onChange: (tab: 'chat' | 'files') => void;
}> = ({ activeTab, onChange }) => {
  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '6px 12px',
    background: active ? theme.tabActiveBg : theme.tabInactiveBg,
    border: 'none',
    borderRadius: theme.tabRadius,
    color: active ? theme.textPrimary : theme.textSecondary,
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    transition: 'background 0.15s',
  });

  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        padding: '8px 16px',
        borderBottom: `1px solid ${theme.panelBorder}`,
      }}
    >
      <button style={tabStyle(activeTab === 'chat')} onClick={() => onChange('chat')}>
        对话
      </button>
      <button style={tabStyle(activeTab === 'files')} onClick={() => onChange('files')}>
        文件
      </button>
    </div>
  );
};

/** 默认侧边栏宽度 */
const DEFAULT_SIDEBAR_WIDTH = 360;

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
  messages,
  sessionFiles,
  onSendMessage,
  sidebarWidth = DEFAULT_SIDEBAR_WIDTH,
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
  const [selectedSession, setSelectedSession] = useState<{ id: string; label: string } | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<'chat' | 'files'>('chat');

  /** 执行一帧渲染（rAF 防抖） */
  const scheduleRender = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const highlightedId = handlerRef.current?.getHighlightedNodeId() ?? null;
      renderFrame(ctx, layoutRef.current, transformRef.current, renderConfig, highlightedId);
    });
  }, [renderConfig]);

  // Effect #1：初始化交互处理器
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handler = new InteractionHandler(canvas, {
      onNodeClick: (id) => {
        const node = layoutRef.current.find((n) => n.id === id);
        setSelectedSession({ id, label: node?.label ?? id });
        onSessionClick?.(id);
      },
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

  // Effect #2：ResizeObserver 监听画布容器尺寸
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
    const highlightedId = handlerRef.current?.getHighlightedNodeId() ?? null;
    renderFrame(ctx, layout, transformRef.current, renderConfig, highlightedId);
  }, [sessions, canvasSize, layoutConfig, renderConfig]);

  /** 关闭侧边栏 */
  const handleCloseSidebar = () => setSelectedSession(null);

  /** 获取当前 session 的消息 */
  const currentMessages = selectedSession ? (messages?.get(selectedSession.id) ?? []) : [];

  /** 获取当前 session 的文件 */
  const currentFiles = selectedSession
    ? (sessionFiles?.(selectedSession.id) ?? {})
    : {};

  return (
    <div
      className={className}
      style={{ display: 'flex', position: 'relative', width: '100%', height: '100%' }}
    >
      {/* Canvas 区域 */}
      <div
        ref={containerRef}
        style={{ flex: 1, position: 'relative', overflow: 'hidden', minWidth: 0 }}
      >
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
        <Tooltip {...tooltip} />
      </div>

      {/* 侧边栏 */}
      {selectedSession && (
        <div
          style={{
            width: sidebarWidth,
            flexShrink: 0,
            background: theme.panelBg,
            borderLeft: `1px solid ${theme.panelBorder}`,
            backdropFilter: theme.panelBlur,
            WebkitBackdropFilter: theme.panelBlur,
            boxShadow: theme.panelShadow,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <TabSwitcher activeTab={activeTab} onChange={setActiveTab} />
          {activeTab === 'chat' ? (
            <ChatPanel
              sessionId={selectedSession.id}
              sessionLabel={selectedSession.label}
              messages={currentMessages}
              onSendMessage={onSendMessage ?? (() => {})}
              onClose={handleCloseSidebar}
            />
          ) : (
            <FilePanel
              sessionId={selectedSession.id}
              sessionLabel={selectedSession.label}
              files={currentFiles}
              onClose={handleCloseSidebar}
            />
          )}
        </div>
      )}
    </div>
  );
};
