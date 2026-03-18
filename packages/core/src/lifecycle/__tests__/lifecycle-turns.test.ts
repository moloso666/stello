import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { NodeFileSystemAdapter } from '../../fs/file-system-adapter';
import { CoreMemory } from '../../memory/core-memory';
import { SessionMemory } from '../../memory/session-memory';
import { SessionTreeImpl } from '../../session/session-tree';
import { LifecycleManager } from '../lifecycle-manager';
import type { CoreSchema, TurnRecord } from '../../types/memory';
import type { StelloConfig, StelloError } from '../../types/engine';

const testSchema: CoreSchema = {
  name: { type: 'string', default: '', bubbleable: true },
  gpa: { type: 'number', default: 0, bubbleable: true },
};

/** 根据 prompt 内容返回不同结果的 mock callLLM */
const mockCallLLM = async (prompt: string): Promise<string> => {
  if (prompt.includes('记忆摘要') || prompt.includes('最终摘要'))
    return '# 更新后的记忆';
  if (prompt.includes('核心档案'))
    return '{"updates":[{"path":"name","value":"测试"}]}';
  if (prompt.includes('对话边界'))
    return '# Scope\n只讨论测试相关';
  return '';
};

const userMsg: TurnRecord = { role: 'user', content: '你好', timestamp: '2026-01-01T00:00:00Z' };
const assistantMsg: TurnRecord = {
  role: 'assistant',
  content: '你好！',
  timestamp: '2026-01-01T00:00:01Z',
};

describe('LifecycleManager — afterTurn & onSessionSwitch & prepareChildSpawn', () => {
  let tmpDir: string;
  let fs: NodeFileSystemAdapter;
  let coreMem: CoreMemory;
  let sessMem: SessionMemory;
  let tree: SessionTreeImpl;
  let lm: LifecycleManager;
  let rootId: string;
  let childId: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'stello-test-'));
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
    await coreMem.init();
    const root = await tree.createRoot('根');
    rootId = root.id;
    const child = await tree.createChild({ parentId: rootId, label: '子' });
    childId = child.id;
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('afterTurn 追加 L3 记录', async () => {
    await lm.afterTurn(childId, userMsg, assistantMsg);
    const records = await sessMem.readRecords(childId);
    expect(records).toHaveLength(2);
    expect(records[0]?.content).toBe('你好');
    expect(records[1]?.content).toBe('你好！');
  });

  it('afterTurn 更新 memory.md', async () => {
    await lm.afterTurn(childId, userMsg, assistantMsg);
    const mem = await sessMem.readMemory(childId);
    expect(mem).toBe('# 更新后的记忆');
  });

  it('afterTurn 检测 L1 变更', async () => {
    await lm.afterTurn(childId, userMsg, assistantMsg);
    await lm.flushBubbles();
    const name = await coreMem.readCore('name');
    expect(name).toBe('测试');
  });

  it('afterTurn 更新父 index.md', async () => {
    await sessMem.writeMemory(childId, '# 子记忆摘要');
    await lm.afterTurn(childId, userMsg, assistantMsg);
    const index = await sessMem.readIndex(rootId);
    expect(index).toContain('子');
  });

  it('afterTurn 返回正确的 AfterTurnResult', async () => {
    const result = await lm.afterTurn(childId, userMsg, assistantMsg);
    expect(result.recordAppended).toBe(true);
    expect(result.memoryUpdated).toBe(true);
    expect(result.coreUpdated).toBe(true);
  });

  it('afterTurn L3 失败不影响 L2 和 L1', async () => {
    // mock appendRecord 抛错
    const orig = sessMem.appendRecord.bind(sessMem);
    vi.spyOn(sessMem, 'appendRecord').mockRejectedValue(new Error('写入失败'));
    const result = await lm.afterTurn(childId, userMsg, assistantMsg);
    expect(result.recordAppended).toBe(false);
    expect(result.memoryUpdated).toBe(true);
    expect(result.coreUpdated).toBe(true);
    vi.restoreAllMocks();
  });

  it('afterTurn 失败时 emit error 事件', async () => {
    vi.spyOn(sessMem, 'appendRecord').mockRejectedValue(new Error('L3 错误'));
    const errors: StelloError[] = [];
    lm.onError((e) => errors.push(e));
    await lm.afterTurn(childId, userMsg, assistantMsg);
    expect(errors.length).toBeGreaterThanOrEqual(1);
    expect(errors[0]?.source).toBe('afterTurn.l3');
    expect(errors[0]?.error.message).toBe('L3 错误');
    vi.restoreAllMocks();
  });

  it('afterTurn 自动递增 turnCount', async () => {
    const before = await tree.get(rootId);
    expect(before?.turnCount).toBe(0);
    await lm.afterTurn(rootId, userMsg, assistantMsg);
    const after = await tree.get(rootId);
    expect(after?.turnCount).toBe(1);
  });

  it('onSessionSwitch 更新旧 memory + bootstrap 新 Session', async () => {
    await sessMem.writeMemory(childId, '旧记忆');
    const result = await lm.onSessionSwitch(childId, rootId);
    // 旧 Session memory.md 已更新
    const updatedMem = await sessMem.readMemory(childId);
    expect(updatedMem).toBe('# 更新后的记忆');
    // 返回新 Session 的 BootstrapResult
    expect(result.session.id).toBe(rootId);
    expect(result.context).toHaveProperty('core');
  });

  it('prepareChildSpawn 创建子 Session + scope + 更新父 index', async () => {
    const newChild = await lm.prepareChildSpawn({ parentId: rootId, label: '新子' });
    expect(newChild.parentId).toBe(rootId);
    // scope.md 已生成
    const scope = await sessMem.readScope(newChild.id);
    expect(scope).toBe('# Scope\n只讨论测试相关');
    // 父 index.md 已更新
    const index = await sessMem.readIndex(rootId);
    expect(index).toContain('新子');
  });
});
