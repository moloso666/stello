import { readFile, writeFile, appendFile, mkdir, access, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type { FileSystemAdapter } from '../types/fs';

/** 判断错误是否为文件不存在 */
function isNotFound(err: unknown): boolean {
  return err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT';
}

/**
 * 基于 Node.js fs/promises 的文件系统适配器
 *
 * 所有路径相对于 basePath 拼接。零外部依赖。
 */
export class NodeFileSystemAdapter implements FileSystemAdapter {
  constructor(private readonly basePath: string) {}

  /** 拼接完整路径 */
  private resolve(filePath: string): string {
    return join(this.basePath, filePath);
  }

  /** 确保父目录存在 */
  private async ensureDir(filePath: string): Promise<void> {
    await mkdir(dirname(filePath), { recursive: true });
  }

  async readJSON<T>(path: string): Promise<T | null> {
    try {
      const raw = await readFile(this.resolve(path), 'utf-8');
      return JSON.parse(raw) as T;
    } catch (err) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }

  async writeJSON(path: string, data: unknown): Promise<void> {
    const full = this.resolve(path);
    await this.ensureDir(full);
    await writeFile(full, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  }

  async appendLine(path: string, line: string): Promise<void> {
    const full = this.resolve(path);
    await this.ensureDir(full);
    await appendFile(full, line + '\n', 'utf-8');
  }

  async readLines(path: string): Promise<string[]> {
    try {
      const raw = await readFile(this.resolve(path), 'utf-8');
      return raw.split('\n').filter((line) => line.length > 0);
    } catch (err) {
      if (isNotFound(err)) return [];
      throw err;
    }
  }

  async mkdir(path: string): Promise<void> {
    await mkdir(this.resolve(path), { recursive: true });
  }

  async exists(path: string): Promise<boolean> {
    try {
      await access(this.resolve(path));
      return true;
    } catch (err) {
      if (isNotFound(err)) return false;
      throw err;
    }
  }

  async listDirs(path: string): Promise<string[]> {
    try {
      const entries = await readdir(this.resolve(path), { withFileTypes: true });
      return entries.filter((e) => e.isDirectory()).map((e) => e.name);
    } catch (err) {
      if (isNotFound(err)) return [];
      throw err;
    }
  }
}
