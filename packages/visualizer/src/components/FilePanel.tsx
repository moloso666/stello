// ─── 文件浏览面板组件 ───

import React from 'react';
import type { SessionFiles } from '../types';
import { theme } from '../styles/theme';

/** FilePanel Props */
export interface FilePanelProps {
  sessionId: string;
  sessionLabel: string;
  files: SessionFiles;
  onClose: () => void;
}

/** 文件区块标题样式 */
const sectionTitleStyle: React.CSSProperties = {
  color: theme.textSecondary,
  fontSize: 12,
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.5,
  marginBottom: 8,
};

/** 代码块样式 */
const preStyle: React.CSSProperties = {
  background: theme.inputBg,
  border: `1px solid ${theme.inputBorder}`,
  borderRadius: 8,
  padding: 12,
  color: theme.textPrimary,
  fontSize: 12,
  lineHeight: 1.6,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  overflowX: 'auto',
  margin: 0,
};

/** 文件浏览面板——只读展示 Session 文件内容 */
export const FilePanel: React.FC<FilePanelProps> = ({
  sessionLabel,
  files,
  onClose,
}) => {
  const sections: { key: keyof SessionFiles; title: string }[] = [
    { key: 'memory', title: 'memory.md' },
    { key: 'scope', title: 'scope.md' },
    { key: 'index', title: 'index.md' },
  ];

  /** 有内容的文件 */
  const visibleSections = sections.filter((s) => files[s.key] !== undefined);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 标题栏 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          borderBottom: `1px solid ${theme.panelBorder}`,
        }}
      >
        <span style={{ color: theme.textPrimary, fontWeight: 600, fontSize: 14 }}>
          {sessionLabel}
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: theme.textSecondary,
            fontSize: 18,
            cursor: 'pointer',
            padding: '0 4px',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {/* 文件内容 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {visibleSections.length === 0 ? (
          <div style={{ color: theme.textMuted, fontSize: 13, textAlign: 'center', marginTop: 32 }}>
            (空)
          </div>
        ) : (
          visibleSections.map((section) => (
            <div key={section.key} style={{ marginBottom: 20 }}>
              <div style={sectionTitleStyle}>{section.title}</div>
              <pre style={preStyle}>{files[section.key] || '(空)'}</pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
