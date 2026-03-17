import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { NodeFileSystemAdapter } from '../../fs/file-system-adapter';
import { CoreMemory } from '../core-memory';
import { BubbleManager } from '../bubble';
import type { CoreSchema } from '../../types/memory';
import type { UpdateProposal } from '../../types/lifecycle';

const testSchema: CoreSchema = {
  name: { type: 'string', default: '', bubbleable: true },
  gpa: { type: 'number', default: 0, bubbleable: true },
  secret: { type: 'string', default: '' },
  schools: { type: 'array', default: [], bubbleable: true, requireConfirm: true },
};

describe('BubbleManager', () => {
  let tmpDir: string;
  let fs: NodeFileSystemAdapter;
  let coreMem: CoreMemory;
  let bm: BubbleManager;

  beforeEach(async () => {
    vi.useFakeTimers();
    tmpDir = await mkdtemp(join(tmpdir(), 'stello-bubble-'));
    fs = new NodeFileSystemAdapter(tmpDir);
    coreMem = new CoreMemory(fs, testSchema);
    await coreMem.init();
    bm = new BubbleManager(coreMem, testSchema, 500);
  });

  afterEach(async () => {
    bm.dispose();
    vi.useRealTimers();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('bubbleable 字段 500ms 后写入 core.json', async () => {
    bm.handleBubble('name', '测试名');
    await vi.advanceTimersByTimeAsync(500);
    const name = await coreMem.readCore('name');
    expect(name).toBe('测试名');
  });

  it('非 bubbleable 字段不触发写入', async () => {
    bm.handleBubble('secret', '机密');
    await vi.advanceTimersByTimeAsync(500);
    const secret = await coreMem.readCore('secret');
    expect(secret).toBe('');
  });

  it('500ms debounce：短时间多次只写最后一次', async () => {
    bm.handleBubble('name', 'A');
    await vi.advanceTimersByTimeAsync(200);
    bm.handleBubble('name', 'B');
    await vi.advanceTimersByTimeAsync(500);
    const name = await coreMem.readCore('name');
    expect(name).toBe('B');
  });

  it('requireConfirm + bubbleable 走确认流程', async () => {
    const proposals: UpdateProposal[] = [];
    coreMem.on('updateProposal', (p) => proposals.push(p));
    bm.handleBubble('schools', ['清华']);
    await vi.advanceTimersByTimeAsync(500);
    // CoreMemory.writeCore 触发 updateProposal，不直接写入
    expect(proposals).toHaveLength(1);
    expect(proposals[0]?.newValue).toEqual(['清华']);
    const schools = await coreMem.readCore('schools');
    expect(schools).toEqual([]);
  });

  it('flush 立即执行所有待处理冒泡', async () => {
    bm.handleBubble('name', '立即');
    bm.handleBubble('gpa', 3.9);
    await bm.flush();
    const name = await coreMem.readCore('name');
    const gpa = await coreMem.readCore('gpa');
    expect(name).toBe('立即');
    expect(gpa).toBe(3.9);
  });

  it('dispose 清理 timer 不执行写入', async () => {
    bm.handleBubble('name', '不写');
    bm.dispose();
    await vi.advanceTimersByTimeAsync(500);
    const name = await coreMem.readCore('name');
    expect(name).toBe('');
  });
});
