// ─── 集成测试：高级流程 ───

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { NodeFileSystemAdapter } from '../fs/file-system-adapter';
import { CoreMemory } from '../memory/core-memory';
import { SessionMemory } from '../memory/session-memory';
import { SessionTreeImpl } from '../session/session-tree';
import { LifecycleManager } from '../lifecycle/lifecycle-manager';
import { SplitGuard } from '../session/split-guard';
import { AgentTools } from '../tools/agent-tools';
import type { CoreSchema, TurnRecord } from '../types/memory';
import type { StelloConfig } from '../types/engine';

// ─── 共享 Setup ───

const testSchema: CoreSchema = {
  name: { type: 'string', default: '', bubbleable: true },
  gpa: { type: 'number', default: 0, bubbleable: true },
  schools: { type: 'array', default: [], bubbleable: true, requireConfirm: true },
};

const mockCallLLM = async (prompt: string): Promise<string> => {
  if (prompt.includes('记忆摘要') || prompt.includes('最终摘要')) return '# 更新后的记忆';
  if (prompt.includes('核心档案')) return '{"updates":[{"path":"name","value":"集成测试"}]}';
  if (prompt.includes('对话边界')) return '# Scope\n只讨论测试';
  return '';
};

const userMsg: TurnRecord = { role: 'user', content: '你好', timestamp: '2026-01-01T00:00:00Z' };
const assistantMsg: TurnRecord = {
  role: 'assistant',
  content: '你好！',
  timestamp: '2026-01-01T00:00:01Z',
};

describe('集成测试 — 高级流程', () => {
  let tmpDir: string;
  let fs: NodeFileSystemAdapter;
  let coreMem: CoreMemory;
  let sessMem: SessionMemory;
  let tree: SessionTreeImpl;
  let lm: LifecycleManager;
  let guard: SplitGuard;
  let tools: AgentTools;
  let rootId: string;
  let childId: string;

  beforeEach(async () => {
    vi.useFakeTimers();
    tmpDir = await mkdtemp(join(tmpdir(), 'stello-integ-adv-'));
    fs = new NodeFileSystemAdapter(tmpDir);
    coreMem = new CoreMemory(fs, testSchema);
    sessMem = new SessionMemory(fs);
    tree = new SessionTreeImpl(fs);
    const config: StelloConfig = {
      dataDir: tmpDir,
      coreSchema: testSchema,
      callLLM: mockCallLLM,
    };
    lm = new LifecycleManager(coreMem, sessMem, tree, config);
    guard = new SplitGuard(tree, { minTurns: 3, cooldownTurns: 5 });
    tools = new AgentTools(tree, coreMem, sessMem, lm, guard);
    await coreMem.init();
    const root = await tree.createRoot('根');
    rootId = root.id;
    // 创建子 Session 并设置 turnCount（满足拆分保护条件）
    const child = await tree.createChild({ parentId: rootId, label: '子' });
    childId = child.id;
    await tree.updateMeta(childId, { turnCount: 5 });
  });

  afterEach(async () => {
    vi.useRealTimers();
    await rm(tmpDir, { recursive: true, force: true });
  });

  // ─── 用例 1：切换 Session ───

  it('切换 Session：旧 memory 更新 + 新 bootstrap', async () => {
    await sessMem.writeMemory(childId, '旧的记忆内容');
    const result = await lm.onSessionSwitch(childId, rootId);
    // 旧 Session memory.md 已更新（mock 返回 '# 更新后的记忆'）
    const updatedMem = await sessMem.readMemory(childId);
    expect(updatedMem).toBe('# 更新后的记忆');
    // 返回新 Session 的 BootstrapResult
    expect(result.session.id).toBe(rootId);
    expect(result.context).toHaveProperty('core');
    expect(result.context.core).toEqual({ name: '', gpa: 0, schools: [] });
  });

  // ─── 用例 2：冒泡写入全局 core.json ───

  it('冒泡：子 Session afterTurn 写入全局 core.json', async () => {
    // 执行子 Session 的 afterTurn（L1 检测到 name 变更）
    await lm.afterTurn(childId, userMsg, assistantMsg);
    // 立即 flush 冒泡（不等 debounce）
    await lm.flushBubbles();
    // core.json name 字段已通过冒泡更新
    const name = await coreMem.readCore('name');
    expect(name).toBe('集成测试');
  });

  // ─── 用例 3：归档子 Session ───

  it('归档子 Session', async () => {
    const result = await tools.executeTool('stello_archive', { sessionId: childId });
    expect(result.success).toBe(true);
    const archived = await tree.get(childId);
    expect(archived?.status).toBe('archived');
  });

  // ─── 用例 4：跨分支引用 ───

  it('跨分支引用', async () => {
    // 创建第二个子 Session
    const child2 = await tree.createChild({ parentId: rootId, label: '子2' });
    // 通过 AgentTools 添加跨分支引用
    const result = await tools.executeTool('stello_add_ref', {
      fromId: childId,
      toId: child2.id,
    });
    expect(result.success).toBe(true);
    // 验证 from.refs 包含 to.id
    const from = await tree.get(childId);
    expect(from?.refs).toContain(child2.id);
  });
});
