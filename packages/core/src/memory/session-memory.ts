// ─── L2 + L3 Session 级记忆读写 ───

import type { FileSystemAdapter } from '../types/fs';
import type { TurnRecord } from '../types/memory';

/** 拼接 Session 内文件路径 */
function sessionPath(sessionId: string, filename: string): string {
  return `sessions/${sessionId}/${filename}`;
}

/**
 * Session 级记忆管理器
 *
 * 封装 FileSystemAdapter，提供 L2（markdown 文件）和 L3（JSONL 对话记录）
 * 的语义化读写方法。
 */
export class SessionMemory {
  constructor(private readonly fs: FileSystemAdapter) {}

  /** 读取 Session 的 memory.md */
  async readMemory(sessionId: string): Promise<string | null> {
    return this.fs.readFile(sessionPath(sessionId, 'memory.md'));
  }

  /** 写入 Session 的 memory.md */
  async writeMemory(sessionId: string, content: string): Promise<void> {
    await this.fs.writeFile(sessionPath(sessionId, 'memory.md'), content);
  }

  /** 读取 Session 的 scope.md */
  async readScope(sessionId: string): Promise<string | null> {
    return this.fs.readFile(sessionPath(sessionId, 'scope.md'));
  }

  /** 写入 Session 的 scope.md */
  async writeScope(sessionId: string, content: string): Promise<void> {
    await this.fs.writeFile(sessionPath(sessionId, 'scope.md'), content);
  }

  /** 读取 Session 的 index.md */
  async readIndex(sessionId: string): Promise<string | null> {
    return this.fs.readFile(sessionPath(sessionId, 'index.md'));
  }

  /** 写入 Session 的 index.md */
  async writeIndex(sessionId: string, content: string): Promise<void> {
    await this.fs.writeFile(sessionPath(sessionId, 'index.md'), content);
  }

  /** 追加一条 L3 对话记录到 records.jsonl */
  async appendRecord(sessionId: string, record: TurnRecord): Promise<void> {
    await this.fs.appendLine(sessionPath(sessionId, 'records.jsonl'), JSON.stringify(record));
  }

  /** 读取 Session 的所有 L3 对话记录 */
  async readRecords(sessionId: string): Promise<TurnRecord[]> {
    const lines = await this.fs.readLines(sessionPath(sessionId, 'records.jsonl'));
    return lines.map((line) => JSON.parse(line) as TurnRecord);
  }
}
