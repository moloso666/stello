import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { NodeFileSystemAdapter } from '../../fs/file-system-adapter';
import { SessionMemory } from '../session-memory';
import type { TurnRecord } from '../../types/memory';

const SESSION_ID = 'test-session-001';

/** 创建测试用 TurnRecord */
function makeTurn(role: TurnRecord['role'], content: string): TurnRecord {
  return { role, content, timestamp: new Date().toISOString() };
}

describe('SessionMemory', () => {
  let tmpDir: string;
  let fs: NodeFileSystemAdapter;
  let mem: SessionMemory;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'stello-test-'));
    fs = new NodeFileSystemAdapter(tmpDir);
    mem = new SessionMemory(fs);
    // 模拟已有 Session 文件夹（与 SessionTree.createRoot 行为一致）
    await fs.mkdir(`sessions/${SESSION_ID}`);
    await fs.writeFile(`sessions/${SESSION_ID}/memory.md`, '');
    await fs.writeFile(`sessions/${SESSION_ID}/scope.md`, '');
    await fs.writeFile(`sessions/${SESSION_ID}/index.md`, '');
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('writeMemory + readMemory 正常读写', async () => {
    await mem.writeMemory(SESSION_ID, '# 记忆摘要\n用户喜欢数学');
    const content = await mem.readMemory(SESSION_ID);
    expect(content).toBe('# 记忆摘要\n用户喜欢数学');
  });

  it('readMemory 空文件返回空字符串', async () => {
    const content = await mem.readMemory(SESSION_ID);
    expect(content).toBe('');
  });

  it('readMemory 不存在的 Session 返回 null', async () => {
    const content = await mem.readMemory('non-existent');
    expect(content).toBeNull();
  });

  it('writeScope + readScope 正常读写', async () => {
    await mem.writeScope(SESSION_ID, '只讨论留学申请相关话题');
    const content = await mem.readScope(SESSION_ID);
    expect(content).toBe('只讨论留学申请相关话题');
  });

  it('readScope 不存在的 Session 返回 null', async () => {
    const content = await mem.readScope('non-existent');
    expect(content).toBeNull();
  });

  it('writeIndex + readIndex 正常读写', async () => {
    const index = '- 子Session A：讨论GPA\n- 子Session B：讨论推荐信';
    await mem.writeIndex(SESSION_ID, index);
    const content = await mem.readIndex(SESSION_ID);
    expect(content).toBe(index);
  });

  it('readIndex 不存在的 Session 返回 null', async () => {
    const content = await mem.readIndex('non-existent');
    expect(content).toBeNull();
  });

  it('appendRecord + readRecords 追加和读取', async () => {
    const t1 = makeTurn('user', '你好');
    const t2 = makeTurn('assistant', '你好！有什么可以帮你的？');
    await mem.appendRecord(SESSION_ID, t1);
    await mem.appendRecord(SESSION_ID, t2);
    const records = await mem.readRecords(SESSION_ID);
    expect(records).toHaveLength(2);
    expect(records[0]?.role).toBe('user');
    expect(records[0]?.content).toBe('你好');
    expect(records[1]?.role).toBe('assistant');
    expect(records[1]?.content).toBe('你好！有什么可以帮你的？');
  });

  it('readRecords 无记录返回空数组', async () => {
    const records = await mem.readRecords(SESSION_ID);
    expect(records).toEqual([]);
  });

  it('appendRecord 多条记录顺序正确', async () => {
    const turns = [
      makeTurn('user', '第一条'),
      makeTurn('assistant', '第二条'),
      makeTurn('user', '第三条'),
    ];
    for (const t of turns) {
      await mem.appendRecord(SESSION_ID, t);
    }
    const records = await mem.readRecords(SESSION_ID);
    expect(records).toHaveLength(3);
    expect(records.map((r) => r.content)).toEqual(['第一条', '第二条', '第三条']);
  });
});
