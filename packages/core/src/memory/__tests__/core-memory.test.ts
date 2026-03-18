import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { NodeFileSystemAdapter } from '../../fs/file-system-adapter';
import { CoreMemory } from '../core-memory';
import type { CoreSchema } from '../../types/memory';
import type { CoreChangeEvent } from '../../types/engine';
import type { UpdateProposal } from '../../types/lifecycle';

/** 测试用 schema */
const testSchema: CoreSchema = {
  name: { type: 'string', default: '' },
  gpa: { type: 'number', default: 0 },
  profile: { type: 'object' },
  schools: { type: 'array', default: [], requireConfirm: true },
  active: { type: 'boolean', default: true },
};

describe('CoreMemory', () => {
  let tmpDir: string;
  let fs: NodeFileSystemAdapter;
  let core: CoreMemory;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'stello-test-'));
    fs = new NodeFileSystemAdapter(tmpDir);
    core = new CoreMemory(fs, testSchema);
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('init 按 schema 默认值创建 core.json', async () => {
    await core.init();
    const raw = await fs.readJSON<Record<string, unknown>>('core.json');
    expect(raw).toEqual({ name: '', gpa: 0, schools: [], active: true });
    // profile 没有 default，不应出现
    expect(raw).not.toHaveProperty('profile');
  });

  it('init 加载已有 core.json', async () => {
    await fs.writeJSON('core.json', { name: '小明', gpa: 3.5 });
    await core.init();
    const data = await core.readCore();
    expect(data).toEqual({ name: '小明', gpa: 3.5 });
  });

  it('readCore 无 path 返回整个对象', async () => {
    await core.init();
    const data = await core.readCore();
    expect(data).toEqual({ name: '', gpa: 0, schools: [], active: true });
  });

  it('readCore 点路径读取嵌套字段', async () => {
    await fs.writeJSON('core.json', { profile: { gpa: 3.8, city: '北京' } });
    await core.init();
    expect(await core.readCore('profile.gpa')).toBe(3.8);
    expect(await core.readCore('profile.city')).toBe('北京');
  });

  it('readCore 不存在的路径返回 undefined', async () => {
    await core.init();
    expect(await core.readCore('profile.not.exist')).toBeUndefined();
  });

  it('writeCore 写入并持久化', async () => {
    await core.init();
    await core.writeCore('name', '小红');
    // 内存验证
    expect(await core.readCore('name')).toBe('小红');
    // 磁盘验证
    const raw = await fs.readJSON<Record<string, unknown>>('core.json');
    expect(raw?.name).toBe('小红');
  });

  it('writeCore 点路径写入嵌套字段', async () => {
    await fs.writeJSON('core.json', { name: '', gpa: 0, profile: {} });
    await core.init();
    await core.writeCore('profile.gpa', 3.8);
    expect(await core.readCore('profile.gpa')).toBe(3.8);
    // 中途路径不存在时自动创建
    await core.writeCore('profile.address.city', '上海');
    expect(await core.readCore('profile.address.city')).toBe('上海');
  });

  it('writeCore schema 校验拒绝非法类型', async () => {
    await core.init();
    await expect(core.writeCore('gpa', 'not a number')).rejects.toThrow('类型不匹配');
    await expect(core.writeCore('name', 123)).rejects.toThrow('类型不匹配');
    await expect(core.writeCore('active', 'yes')).rejects.toThrow('类型不匹配');
  });

  it('writeCore 不存在的 schema 字段抛错', async () => {
    await core.init();
    await expect(core.writeCore('unknown', 1)).rejects.toThrow('不存在字段');
  });

  it('onChange 事件触发', async () => {
    await core.init();
    const events: CoreChangeEvent[] = [];
    core.on('change', (e) => events.push(e));
    await core.writeCore('gpa', 3.9);
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ path: 'gpa', oldValue: 0, newValue: 3.9 });
  });

  it('requireConfirm 字段触发 proposal 而不写入', async () => {
    await core.init();
    const proposals: UpdateProposal[] = [];
    core.on('updateProposal', (p) => proposals.push(p));
    await core.writeCore('schools', ['清华']);
    // 应触发 proposal
    expect(proposals).toHaveLength(1);
    expect(proposals[0]?.path).toBe('schools');
    expect(proposals[0]?.newValue).toEqual(['清华']);
    // 数据不应变更
    expect(await core.readCore('schools')).toEqual([]);
  });

  it('confirmWrite 实际写入 + 触发 change', async () => {
    await core.init();
    const changes: CoreChangeEvent[] = [];
    core.on('change', (e) => changes.push(e));
    await core.confirmWrite('schools', ['北大']);
    // 数据已写入
    expect(await core.readCore('schools')).toEqual(['北大']);
    // change 事件已触发
    expect(changes).toHaveLength(1);
    expect(changes[0]).toEqual({ path: 'schools', oldValue: [], newValue: ['北大'] });
  });

  // ─── 别名方法 ───

  it('getAll() 返回全部档案', async () => {
    await core.init();
    await core.writeCore('name', 'Alice');
    const all = await core.getAll();
    expect(all).toEqual({ name: 'Alice', gpa: 0, schools: [], active: true });
  });

  it('get(path) 读取指定字段', async () => {
    await core.init();
    await core.writeCore('gpa', 3.9);
    const val = await core.get('gpa');
    expect(val).toBe(3.9);
  });
});
