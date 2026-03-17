import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { NodeFileSystemAdapter } from '../../fs/file-system-adapter';
import { CoreMemory } from '../../memory/core-memory';
import { SessionMemory } from '../../memory/session-memory';
import { SessionTreeImpl } from '../../session/session-tree';
import { LifecycleManager } from '../lifecycle-manager';
import type { CoreSchema } from '../../types/memory';
import type { StelloConfig } from '../../types/engine';
import type { SessionMeta } from '../../types/session';

const testSchema: CoreSchema = {
  name: { type: 'string', default: '' },
  gpa: { type: 'number', default: 0 },
};

/** 创建 LifecycleManager 及其依赖 */
function createManager(
  fs: NodeFileSystemAdapter,
  tmpDir: string,
  policy: StelloConfig['inheritancePolicy'] = 'summary',
) {
  const coreMem = new CoreMemory(fs, testSchema);
  const sessMem = new SessionMemory(fs);
  const tree = new SessionTreeImpl(fs);
  const config: StelloConfig = {
    dataDir: tmpDir,
    coreSchema: testSchema,
    callLLM: async () => 'mock',
    inheritancePolicy: policy,
  };
  const lm = new LifecycleManager(coreMem, sessMem, tree, config);
  return { coreMem, sessMem, tree, lm };
}

describe('LifecycleManager — bootstrap & assemble', () => {
  let tmpDir: string;
  let fs: NodeFileSystemAdapter;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'stello-test-'));
    fs = new NodeFileSystemAdapter(tmpDir);
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('bootstrap 返回正确的 context 和 session', async () => {
    const { coreMem, sessMem, tree, lm } = createManager(fs, tmpDir);
    await coreMem.init();
    const root = await tree.createRoot('根');
    await sessMem.writeMemory(root.id, '# 记忆');
    await sessMem.writeScope(root.id, '# 边界');
    const result = await lm.bootstrap(root.id);
    expect(result.session.id).toBe(root.id);
    expect(result.context.core).toEqual({ name: '', gpa: 0 });
    expect(result.context.currentMemory).toBe('# 记忆');
    expect(result.context.scope).toBe('# 边界');
  });

  it('summary 策略只读父 memory', async () => {
    const { coreMem, sessMem, tree, lm } = createManager(fs, tmpDir, 'summary');
    await coreMem.init();
    const root = await tree.createRoot('根');
    const child = await tree.createChild({ parentId: root.id, label: '子' });
    await sessMem.writeMemory(root.id, '父的记忆');
    const result = await lm.bootstrap(child.id);
    expect(result.context.memories).toEqual(['父的记忆']);
  });

  it('full 策略读所有祖先按根到父排序', async () => {
    const { coreMem, sessMem, tree, lm } = createManager(fs, tmpDir, 'full');
    await coreMem.init();
    const root = await tree.createRoot('根');
    const mid = await tree.createChild({ parentId: root.id, label: '中' });
    const leaf = await tree.createChild({ parentId: mid.id, label: '叶' });
    await sessMem.writeMemory(root.id, '根记忆');
    await sessMem.writeMemory(mid.id, '中记忆');
    const result = await lm.bootstrap(leaf.id);
    expect(result.context.memories).toEqual(['根记忆', '中记忆']);
  });

  it('minimal 策略不读任何 memory', async () => {
    const { coreMem, sessMem, tree, lm } = createManager(fs, tmpDir, 'minimal');
    await coreMem.init();
    const root = await tree.createRoot('根');
    const child = await tree.createChild({ parentId: root.id, label: '子' });
    await sessMem.writeMemory(root.id, '父记忆');
    const result = await lm.bootstrap(child.id);
    expect(result.context.memories).toEqual([]);
  });

  it('scoped 策略读父+同 scope 兄弟', async () => {
    const { coreMem, sessMem, tree, lm } = createManager(fs, tmpDir, 'scoped');
    await coreMem.init();
    const root = await tree.createRoot('根');
    const a = await tree.createChild({ parentId: root.id, label: 'A', scope: 'math' });
    const b = await tree.createChild({ parentId: root.id, label: 'B', scope: 'math' });
    const c = await tree.createChild({ parentId: root.id, label: 'C', scope: 'english' });
    await sessMem.writeMemory(root.id, '父记忆');
    await sessMem.writeMemory(b.id, 'B记忆');
    await sessMem.writeMemory(c.id, 'C记忆');
    const result = await lm.bootstrap(a.id);
    // 应包含父 + 同 scope 兄弟 B，不包含不同 scope 的 C
    expect(result.context.memories).toContain('父记忆');
    expect(result.context.memories).toContain('B记忆');
    expect(result.context.memories).not.toContain('C记忆');
  });

  it('assemble 返回 AssembledContext', async () => {
    const { coreMem, tree, lm } = createManager(fs, tmpDir);
    await coreMem.init();
    const root = await tree.createRoot('根');
    const ctx = await lm.assemble(root.id);
    expect(ctx).toHaveProperty('core');
    expect(ctx).toHaveProperty('memories');
    expect(ctx).toHaveProperty('currentMemory');
    expect(ctx).toHaveProperty('scope');
  });
});
