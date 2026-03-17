// ─── 集成测试：基础流程 ───

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { NodeFileSystemAdapter } from '../fs/file-system-adapter';
import { CoreMemory } from '../memory/core-memory';
import { SessionMemory } from '../memory/session-memory';
import { SessionTreeImpl } from '../session/session-tree';
import { LifecycleManager } from '../lifecycle/lifecycle-manager';
import { SplitGuard } from '../session/split-guard';
import { SkillRouterImpl } from '../skill/skill-router';
import { AgentTools } from '../tools/agent-tools';
import type { CoreSchema, TurnRecord } from '../types/memory';
import type { StelloConfig } from '../types/engine';
import type { Skill } from '../types/lifecycle';

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

describe('集成测试 — 基础流程', () => {
  let tmpDir: string;
  let fs: NodeFileSystemAdapter;
  let coreMem: CoreMemory;
  let sessMem: SessionMemory;
  let tree: SessionTreeImpl;
  let lm: LifecycleManager;
  let guard: SplitGuard;
  let router: SkillRouterImpl;
  let tools: AgentTools;
  let rootId: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'stello-integ-'));
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
    router = new SkillRouterImpl();
    tools = new AgentTools(tree, coreMem, sessMem, lm, guard);
    await coreMem.init();
    const root = await tree.createRoot('根');
    rootId = root.id;
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  // ─── 用例 1：初始化 + bootstrap 根 Session ───

  it('初始化 + bootstrap 根 Session', async () => {
    const result = await lm.bootstrap(rootId);
    // context.core 包含 schema 默认值
    expect(result.context.core).toEqual({ name: '', gpa: 0, schools: [] });
    // session.id 正确
    expect(result.session.id).toBe(rootId);
    expect(result.session.parentId).toBeNull();
    expect(result.session.depth).toBe(0);
  });

  // ─── 用例 2：注册 Skill + 匹配 ───

  it('注册 Skill + 匹配命中', () => {
    const skill: Skill = {
      name: '翻译',
      description: '翻译文本',
      keywords: ['翻译', 'translate'],
      guidancePrompt: '请输入需要翻译的内容',
      handler: async () => ({ reply: '翻译完成' }),
    };
    router.register(skill);
    const msg: TurnRecord = { role: 'user', content: '帮我翻译这段话', timestamp: '' };
    const matched = router.match(msg);
    expect(matched).not.toBeNull();
    expect(matched!.name).toBe('翻译');
  });

  // ─── 用例 3：一轮对话 L1/L2/L3 全写入 ───

  it('一轮对话：L3 记录 + L2 记忆 + L1 核心档案全部更新', async () => {
    const result = await lm.afterTurn(rootId, userMsg, assistantMsg);
    expect(result.recordAppended).toBe(true);
    expect(result.memoryUpdated).toBe(true);
    expect(result.coreUpdated).toBe(true);
    // L3：records.jsonl 有 2 条
    const records = await sessMem.readRecords(rootId);
    expect(records).toHaveLength(2);
    // L2：memory.md 已更新
    const mem = await sessMem.readMemory(rootId);
    expect(mem).toBe('# 更新后的记忆');
    // L1：flush 冒泡后 core.json name 字段更新
    await lm.flushBubbles();
    const name = await coreMem.readCore('name');
    expect(name).toBe('集成测试');
  });

  // ─── 用例 4：通过 AgentTools 创建子 Session ───

  it('通过 AgentTools 创建子 Session', async () => {
    // 先满足拆分保护的最少轮次要求
    await tree.updateMeta(rootId, { turnCount: 5 });
    const result = await tools.executeTool('stello_create_session', {
      parentId: rootId,
      label: '子话题',
    });
    expect(result.success).toBe(true);
    const child = result.data as { id: string; parentId: string };
    expect(child.parentId).toBe(rootId);
    // scope.md 已生成
    const scope = await sessMem.readScope(child.id);
    expect(scope).toBe('# Scope\n只讨论测试');
    // 父 index.md 已更新
    const index = await sessMem.readIndex(rootId);
    expect(index).toContain('子话题');
  });

  // ─── 用例 5：拆分保护拒绝（轮次不足） ───

  it('拆分保护拒绝（轮次不足）', async () => {
    // turnCount 默认 0 < minTurns 3
    const result = await tools.executeTool('stello_create_session', {
      parentId: rootId,
      label: '不允许',
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain('轮次不足');
  });
});
