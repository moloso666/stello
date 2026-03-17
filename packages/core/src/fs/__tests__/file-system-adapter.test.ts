import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { NodeFileSystemAdapter } from '../file-system-adapter';

describe('NodeFileSystemAdapter', () => {
  let tmpDir: string;
  let adapter: NodeFileSystemAdapter;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'stello-test-'));
    adapter = new NodeFileSystemAdapter(tmpDir);
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('mkdir 创建嵌套目录', async () => {
    await adapter.mkdir('a/b/c');
    const info = await stat(join(tmpDir, 'a/b/c'));
    expect(info.isDirectory()).toBe(true);
  });

  it('exists 返回正确结果', async () => {
    await adapter.mkdir('existing-dir');
    expect(await adapter.exists('existing-dir')).toBe(true);
    expect(await adapter.exists('not-existing')).toBe(false);
  });

  it('writeJSON + readJSON 正常读写', async () => {
    const data = { name: 'stello', version: 1, nested: { key: 'value' } };
    await adapter.writeJSON('test.json', data);
    const result = await adapter.readJSON('test.json');
    expect(result).toEqual(data);
  });

  it('readJSON 文件不存在返回 null', async () => {
    const result = await adapter.readJSON('not-exist.json');
    expect(result).toBeNull();
  });

  it('writeJSON 自动创建父目录', async () => {
    const data = { deep: true };
    await adapter.writeJSON('deep/nested/file.json', data);
    const result = await adapter.readJSON('deep/nested/file.json');
    expect(result).toEqual(data);
  });

  it('appendLine + readLines 追加和读取', async () => {
    await adapter.appendLine('log.txt', 'line-1');
    await adapter.appendLine('log.txt', 'line-2');
    await adapter.appendLine('log.txt', 'line-3');
    const lines = await adapter.readLines('log.txt');
    expect(lines).toEqual(['line-1', 'line-2', 'line-3']);
  });

  it('readLines 文件不存在返回空数组', async () => {
    const lines = await adapter.readLines('not-exist.txt');
    expect(lines).toEqual([]);
  });

  it('listDirs 只返回子目录', async () => {
    await adapter.mkdir('sessions/session-1');
    await adapter.mkdir('sessions/session-2');
    await writeFile(join(tmpDir, 'sessions', 'README.md'), 'ignore me');
    const dirs = await adapter.listDirs('sessions');
    expect(dirs.sort()).toEqual(['session-1', 'session-2']);
  });

  it('listDirs 目录不存在返回空数组', async () => {
    const dirs = await adapter.listDirs('not-exist');
    expect(dirs).toEqual([]);
  });
});
