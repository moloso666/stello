// ─── 冒泡管理器 ───

import type { CoreSchema } from '../types/memory';
import type { CoreMemory } from './core-memory';

/** 待处理的冒泡写入 */
interface PendingBubble {
  value: unknown;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * 冒泡管理器
 *
 * 子 Session 的 L1 字段变更只有标记 bubbleable 的才冒泡写入全局 core.json，
 * 同字段短时间多次变更通过 debounce 合并为一次写入。
 */
export class BubbleManager {
  private pending = new Map<string, PendingBubble>();

  constructor(
    private readonly coreMemory: CoreMemory,
    private readonly schema: CoreSchema,
    private readonly debounceMs: number = 500,
  ) {}

  /** 处理一次冒泡：过滤非 bubbleable 字段，debounce 后写入 */
  handleBubble(path: string, value: unknown): void {
    const topKey = path.split('.')[0]!;
    const field = this.schema[topKey];
    if (!field?.bubbleable) return;

    const existing = this.pending.get(path);
    if (existing) clearTimeout(existing.timer);

    const timer = setTimeout(() => {
      this.pending.delete(path);
      void this.coreMemory.writeCore(path, value);
    }, this.debounceMs);
    this.pending.set(path, { value, timer });
  }

  /** 立即执行所有待处理的冒泡（关闭前 / 测试用） */
  async flush(): Promise<void> {
    const entries = [...this.pending.entries()];
    this.pending.clear();
    for (const [path, { value, timer }] of entries) {
      clearTimeout(timer);
      await this.coreMemory.writeCore(path, value);
    }
  }

  /** 清理所有 timer（不执行写入） */
  dispose(): void {
    for (const { timer } of this.pending.values()) {
      clearTimeout(timer);
    }
    this.pending.clear();
  }
}
