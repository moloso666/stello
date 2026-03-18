// ─── 对话面板组件 ───

import React, { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '../types';
import { theme } from '../styles/theme';

/** ChatPanel Props */
export interface ChatPanelProps {
  sessionId: string;
  sessionLabel: string;
  messages: ChatMessage[];
  onSendMessage: (sessionId: string, text: string) => void;
  onClose: () => void;
}

/** 用户消息气泡样式 */
const userBubbleStyle: React.CSSProperties = {
  alignSelf: 'flex-end',
  background: theme.buttonBg,
  color: theme.textPrimary,
  padding: '8px 12px',
  borderRadius: '12px 12px 4px 12px',
  maxWidth: '80%',
  wordBreak: 'break-word',
};

/** 助手消息气泡样式 */
const assistantBubbleStyle: React.CSSProperties = {
  alignSelf: 'flex-start',
  background: theme.inputBg,
  color: theme.textPrimary,
  padding: '8px 12px',
  borderRadius: '12px 12px 12px 4px',
  maxWidth: '80%',
  wordBreak: 'break-word',
};

/** 对话面板——展示消息列表 + 输入框 */
export const ChatPanel: React.FC<ChatPanelProps> = ({
  sessionId,
  sessionLabel,
  messages,
  onSendMessage,
  onClose,
}) => {
  const [inputValue, setInputValue] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  /** 自动滚到底部 */
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  /** 发送消息 */
  const handleSend = () => {
    const text = inputValue.trim();
    if (!text) return;
    onSendMessage(sessionId, text);
    setInputValue('');
  };

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

      {/* 消息列表 */}
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
        }}
      >
        {messages.map((msg, i) => (
          <div key={i} style={msg.role === 'user' ? userBubbleStyle : assistantBubbleStyle}>
            <div style={{ fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {msg.content}
            </div>
            <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 4, textAlign: 'right' }}>
              {msg.timestamp}
            </div>
          </div>
        ))}
      </div>

      {/* 输入区 */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: '12px 16px',
          borderTop: `1px solid ${theme.panelBorder}`,
        }}
      >
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="输入消息..."
          style={{
            flex: 1,
            background: theme.inputBg,
            border: `1px solid ${theme.inputBorder}`,
            borderRadius: 8,
            padding: '8px 12px',
            color: theme.textPrimary,
            fontSize: 13,
            outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          style={{
            background: theme.buttonBg,
            border: 'none',
            borderRadius: 8,
            padding: '8px 16px',
            color: theme.textPrimary,
            fontSize: 13,
            cursor: 'pointer',
          }}
        >
          发送
        </button>
      </div>
    </div>
  );
};
