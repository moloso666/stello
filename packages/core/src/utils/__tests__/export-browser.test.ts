import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { NodeFileSystemAdapter } from '../../fs/file-system-adapter';
import { CoreMemory } from '../../memory/core-memory';
import { SessionMemory } from '../../memory/session-memory';
import { SessionTreeImpl } from '../../session/session-tree';
import { exportForBrowser } from '../export-browser';
import type { CoreSchema } from '../../types/memory';

const testSchema: CoreSchema = {
  name: { type: 'string', default: '' },
};

describe('exportForBrowser', () => {
  let tmpDir: string;
  let fs: NodeFileSystemAdapter;
  let coreMem: CoreMemory;
  let sessMem: SessionMemory;
  let tree: SessionTreeImpl;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'stello-export-'));
    fs = new NodeFileSystemAdapter(tmpDir);
    coreMem = new CoreMemory(fs, testSchema);
    sessMem = new SessionMemory(fs);
    tree = new SessionTreeImpl(fs);
    await coreMem.init();
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('空数据时返回空 sessions 和空 memories', async () => {
    const result = await exportForBrowser(tree, sessMem, coreMem);
    expect(result.sessions).toEqual([]);
    expect(result.memories).toEqual({});
    expect(result.core).toEqual({ name: '' });
  });

  it('有 root + child 时 memories 包含所有 session', async () => {
    const root = await tree.createRoot('根');
    const child = await tree.createChild({ parentId: root.id, label: '子' });
    await sessMem.writeMemory(root.id, '# 根记忆');
    await sessMem.writeMemory(child.id, '# 子记忆');

    const result = await exportForBrowser(tree, sessMem, coreMem);
    expect(result.sessions).toHaveLength(2);
    expect(result.memories[root.id]).toBe('# 根记忆');
    expect(result.memories[child.id]).toBe('# 子记忆');
  });

  it('core 数据正确导出', async () => {
    await tree.createRoot('根');
    await coreMem.writeCore('name', 'Alice');
    const result = await exportForBrowser(tree, sessMem, coreMem);
    expect(result.core.name).toBe('Alice');
  });
});
