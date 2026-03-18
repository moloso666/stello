// ─── L1 核心档案管理器 ───

import { randomUUID } from 'node:crypto';
import type { FileSystemAdapter } from '../types/fs';
import type { CoreSchema, CoreSchemaField } from '../types/memory';
import type { CoreChangeEvent } from '../types/engine';
import type { UpdateProposal } from '../types/lifecycle';

/** CoreMemory 支持的事件类型 */
interface CoreMemoryEventMap {
  change: CoreChangeEvent;
  updateProposal: UpdateProposal;
}

/** 按点路径读取嵌套值 */
function getByPath(obj: Record<string, unknown>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/** 按点路径写入嵌套值，中途路径不存在则自动创建空对象 */
function setByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]!;
    if (current[key] === undefined || current[key] === null || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  current[keys[keys.length - 1]!] = value;
}

/** 校验值类型是否匹配 schema 字段定义 */
function validateType(field: CoreSchemaField, value: unknown): boolean {
  switch (field.type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number';
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      return Array.isArray(value);
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}

/** 按 schema 的 default 字段生成初始数据 */
function buildDefaults(schema: CoreSchema): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(schema)) {
    if (field.default !== undefined) {
      result[key] = field.default;
    }
  }
  return result;
}

// 事件处理函数类型
type EventHandler<T> = (data: T) => void;

/**
 * L1 核心档案管理器
 *
 * 负责全局 core.json 的读写，支持点路径访问、schema 校验、
 * onChange 事件通知和 requireConfirm 确认流程。
 */
export class CoreMemory {
  /** 内存中的 core.json 数据 */
  private data: Record<string, unknown> = {};
  /** 事件监听器 */
  private listeners = new Map<string, Set<EventHandler<never>>>();

  constructor(
    private readonly fs: FileSystemAdapter,
    private readonly schema: CoreSchema,
  ) {}

  /** 初始化：加载或创建 core.json */
  async init(): Promise<void> {
    const existing = await this.fs.readJSON<Record<string, unknown>>('core.json');
    if (existing) {
      this.data = existing;
    } else {
      this.data = buildDefaults(this.schema);
      await this.fs.writeJSON('core.json', this.data);
    }
  }

  /** 读取 L1 核心档案，支持点路径（如 'profile.gpa'） */
  async readCore(path?: string): Promise<unknown> {
    if (!path) return { ...this.data };
    return getByPath(this.data, path);
  }

  /** 读取全部核心档案（readCore 无参数的别名） */
  async getAll(): Promise<Record<string, unknown>> {
    return this.readCore() as Promise<Record<string, unknown>>;
  }

  /** 读取指定路径（readCore 有参数的别名） */
  async get(path: string): Promise<unknown> {
    return this.readCore(path);
  }

  /** 写入 L1 核心档案，校验 schema + requireConfirm 检查 */
  async writeCore(path: string, value: unknown): Promise<void> {
    const topKey = path.split('.')[0]!;
    const field = this.schema[topKey];
    if (!field) throw new Error(`Schema 中不存在字段: ${topKey}`);
    // 顶层写入时校验类型
    if (!path.includes('.') && !validateType(field, value)) {
      throw new Error(`类型不匹配: ${topKey} 期望 ${field.type}`);
    }
    // requireConfirm 字段走确认流程
    if (field.requireConfirm) {
      const oldValue = getByPath(this.data, path);
      this.emit('updateProposal', {
        id: randomUUID(),
        path,
        oldValue,
        newValue: value,
        reason: '',
      });
      return;
    }
    await this.doWrite(path, value);
  }

  /** 确认写入（跳过 requireConfirm 检查），供 ConfirmProtocol 调用 */
  async confirmWrite(path: string, value: unknown): Promise<void> {
    await this.doWrite(path, value);
  }

  /** 实际写入 + 持久化 + 触发 change 事件 */
  private async doWrite(path: string, value: unknown): Promise<void> {
    const oldValue = getByPath(this.data, path);
    setByPath(this.data, path, value);
    await this.fs.writeJSON('core.json', this.data);
    this.emit('change', { path, oldValue, newValue: value });
  }

  /** 注册事件监听 */
  on<K extends keyof CoreMemoryEventMap>(
    event: K,
    handler: EventHandler<CoreMemoryEventMap[K]>,
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler as EventHandler<never>);
  }

  /** 取消事件监听 */
  off<K extends keyof CoreMemoryEventMap>(
    event: K,
    handler: EventHandler<CoreMemoryEventMap[K]>,
  ): void {
    this.listeners.get(event)?.delete(handler as EventHandler<never>);
  }

  /** 触发事件 */
  private emit<K extends keyof CoreMemoryEventMap>(event: K, data: CoreMemoryEventMap[K]): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    for (const handler of handlers) {
      (handler as EventHandler<CoreMemoryEventMap[K]>)(data);
    }
  }
}
