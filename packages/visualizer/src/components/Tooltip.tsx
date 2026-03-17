// ─── 悬浮提示组件 ───

import React from 'react';

/** Tooltip 组件 Props */
export interface TooltipProps {
  /** 是否可见 */
  visible: boolean;
  /** 屏幕 X 坐标 */
  x: number;
  /** 屏幕 Y 坐标 */
  y: number;
  /** 节点标签 */
  label: string;
  /** 记忆摘要（截取前 100 字符） */
  memoryExcerpt?: string;
}

/** 悬浮提示气泡 */
export const Tooltip: React.FC<TooltipProps> = ({ visible, x, y, label, memoryExcerpt }) => {
  if (!visible) return null;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: 'translate(-50%, -100%)',
        marginTop: -8,
        padding: '8px 12px',
        background: 'rgba(0, 0, 0, 0.85)',
        color: '#fff',
        borderRadius: 6,
        fontSize: 13,
        lineHeight: 1.4,
        maxWidth: 240,
        pointerEvents: 'none',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        zIndex: 10,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: memoryExcerpt ? 4 : 0 }}>{label}</div>
      {memoryExcerpt && (
        <div style={{ opacity: 0.7, fontSize: 12 }}>{memoryExcerpt}</div>
      )}
    </div>
  );
};
