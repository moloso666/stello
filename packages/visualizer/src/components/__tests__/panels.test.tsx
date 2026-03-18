// ─── 面板组件测试 ───

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatPanel } from '../ChatPanel';
import { FilePanel } from '../FilePanel';

describe('ChatPanel — 对话面板', () => {
  const defaultProps = {
    sessionId: 'sess-1',
    sessionLabel: '测试 Session',
    messages: [
      { role: 'user', content: '你好', timestamp: '12:00' },
      { role: 'assistant', content: '你好呀', timestamp: '12:01' },
    ],
    onSendMessage: vi.fn(),
    onClose: vi.fn(),
  };

  it('渲染消息列表', () => {
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByText('你好')).toBeTruthy();
    expect(screen.getByText('你好呀')).toBeTruthy();
    expect(screen.getByText('测试 Session')).toBeTruthy();
  });

  it('发送消息触发回调', () => {
    render(<ChatPanel {...defaultProps} />);
    const input = screen.getByPlaceholderText('输入消息...');
    fireEvent.change(input, { target: { value: '新消息' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(defaultProps.onSendMessage).toHaveBeenCalledWith('sess-1', '新消息');
  });
});

describe('FilePanel — 文件浏览面板', () => {
  const defaultProps = {
    sessionId: 'sess-1',
    sessionLabel: '测试 Session',
    files: {
      memory: '# 记忆内容\n这是记忆',
      scope: '# 范围\n对话范围定义',
    },
    onClose: vi.fn(),
  };

  it('渲染文件内容', () => {
    render(<FilePanel {...defaultProps} />);
    expect(screen.getByText('memory.md')).toBeTruthy();
    expect(screen.getByText('scope.md')).toBeTruthy();
    // pre 标签内的多行文本需要用函数匹配
    expect(screen.getByText((content) => content.includes('记忆内容'))).toBeTruthy();
  });

  it('空文件显示占位', () => {
    render(<FilePanel {...defaultProps} files={{}} />);
    expect(screen.getByText('(空)')).toBeTruthy();
  });
});
