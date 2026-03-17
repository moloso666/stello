// ─── 生命周期管理器 ───

import type { StelloConfig, StelloError } from '../types/engine';
import type { AssembledContext, TurnRecord, InheritancePolicy } from '../types/memory';
import type { SessionMeta, CreateSessionOptions } from '../types/session';
import type { BootstrapResult, AfterTurnResult } from '../types/lifecycle';
import type { CoreMemory } from '../memory/core-memory';
import type { SessionMemory } from '../memory/session-memory';
import type { SessionTreeImpl } from '../session/session-tree';
import { BubbleManager } from '../memory/bubble';

/** LLM 返回的 L1 变更格式 */
interface CoreUpdate {
  path: string;
  value: unknown;
}

/**
 * 生命周期管理器
 *
 * 串联 Session 系统、记忆系统和 LLM 调用，
 * 完成上下文组装和每轮对话的记忆更新。
 */
export class LifecycleManager {
  private readonly callLLM: (prompt: string) => Promise<string>;
  private readonly inheritancePolicy: InheritancePolicy;
  private readonly bubbleManager: BubbleManager;
  private errorHandlers = new Set<(e: StelloError) => void>();

  constructor(
    private readonly coreMemory: CoreMemory,
    private readonly sessionMemory: SessionMemory,
    private readonly sessions: SessionTreeImpl,
    config: StelloConfig,
  ) {
    this.callLLM = config.callLLM;
    this.inheritancePolicy = config.inheritancePolicy ?? 'summary';
    this.bubbleManager = new BubbleManager(
      coreMemory,
      config.coreSchema,
      config.bubblePolicy?.debounceMs ?? 500,
    );
  }

  /** 进入 Session 时组装上下文 */
  async bootstrap(sessionId: string): Promise<BootstrapResult> {
    const session = await this.sessions.get(sessionId);
    if (!session) throw new Error(`Session 不存在: ${sessionId}`);
    const context = await this.assembleContext(sessionId, session);
    return { context, session };
  }

  /** 组装 prompt 上下文 */
  async assemble(sessionId: string): Promise<AssembledContext> {
    const session = await this.sessions.get(sessionId);
    if (!session) throw new Error(`Session 不存在: ${sessionId}`);
    return this.assembleContext(sessionId, session);
  }

  /** 每轮结束处理：三层独立，某层失败不影响其他层 */
  async afterTurn(
    sessionId: string,
    userMsg: TurnRecord,
    assistantMsg: TurnRecord,
  ): Promise<AfterTurnResult> {
    const result: AfterTurnResult = {
      coreUpdated: false,
      memoryUpdated: false,
      recordAppended: false,
    };

    // 第一层：L3 追加对话记录
    try {
      await this.sessionMemory.appendRecord(sessionId, userMsg);
      await this.sessionMemory.appendRecord(sessionId, assistantMsg);
      result.recordAppended = true;
    } catch (err) {
      this.emitError('afterTurn.l3', err);
    }

    // 第二层：L2 更新 memory.md
    try {
      const currentMemory = await this.sessionMemory.readMemory(sessionId);
      const prompt = `基于以下对话更新记忆摘要。\n\n当前记忆：\n${currentMemory || '(空)'}\n\n新对话：\n用户：${userMsg.content}\n助手：${assistantMsg.content}\n\n输出更新后的记忆摘要（markdown），只输出内容。`;
      const newMemory = await this.callLLM(prompt);
      await this.sessionMemory.writeMemory(sessionId, newMemory);
      result.memoryUpdated = true;
    } catch (err) {
      this.emitError('afterTurn.l2', err);
    }

    // 第三层：L1 检测核心档案变更
    try {
      const core = await this.coreMemory.readCore();
      const prompt = `基于对话判断是否需要更新核心档案。\n\n当前档案：\n${JSON.stringify(core)}\n\n新对话：\n用户：${userMsg.content}\n助手：${assistantMsg.content}\n\n如需更新输出 JSON：{"updates":[{"path":"字段","value":值}]}\n不需要输出：{"updates":[]}\n只输出 JSON。`;
      const response = await this.callLLM(prompt);
      const { updates } = JSON.parse(response) as { updates: CoreUpdate[] };
      for (const u of updates) {
        this.bubbleManager.handleBubble(u.path, u.value);
      }
      result.coreUpdated = updates.length > 0;
    } catch (err) {
      this.emitError('afterTurn.l1', err);
    }

    // 更新父 index.md
    try {
      const session = await this.sessions.get(sessionId);
      if (session?.parentId) {
        await this.updateParentIndex(session.parentId);
      }
    } catch (err) {
      this.emitError('afterTurn.index', err);
    }

    return result;
  }

  /** 切换 Session：旧 Session 更新 memory → 新 Session bootstrap */
  async onSessionSwitch(fromId: string, toId: string): Promise<BootstrapResult> {
    try {
      const currentMemory = await this.sessionMemory.readMemory(fromId);
      const prompt = `整理以下对话记忆为最终摘要。\n\n当前记忆：\n${currentMemory || '(空)'}\n\n输出最终记忆摘要（markdown），只输出内容。`;
      const finalMemory = await this.callLLM(prompt);
      await this.sessionMemory.writeMemory(fromId, finalMemory);
    } catch (err) {
      this.emitError('onSessionSwitch.from', err);
    }
    return this.bootstrap(toId);
  }

  /** 创建子 Session + 生成 scope.md + 更新父 index.md */
  async prepareChildSpawn(options: CreateSessionOptions): Promise<SessionMeta> {
    const child = await this.sessions.createChild(options);
    try {
      const parent = await this.sessions.get(options.parentId);
      const prompt = `为新建的子对话生成对话边界说明。\n\n父对话标题：${parent?.label ?? ''}\n子对话标题：${child.label}\n\n输出 scope.md 内容（markdown），说明这个对话能讨论什么、不能讨论什么。只输出内容。`;
      const scopeContent = await this.callLLM(prompt);
      await this.sessionMemory.writeScope(child.id, scopeContent);
      await this.updateParentIndex(options.parentId);
    } catch (err) {
      this.emitError('prepareChildSpawn', err);
    }
    return child;
  }

  /** 立即执行所有待处理的冒泡写入 */
  async flushBubbles(): Promise<void> {
    await this.bubbleManager.flush();
  }

  /** 注册错误监听 */
  onError(handler: (e: StelloError) => void): void {
    this.errorHandlers.add(handler);
  }

  /** 取消错误监听 */
  offError(handler: (e: StelloError) => void): void {
    this.errorHandlers.delete(handler);
  }

  /** 按继承策略组装上下文 */
  private async assembleContext(
    sessionId: string,
    session: SessionMeta,
  ): Promise<AssembledContext> {
    const core = (await this.coreMemory.readCore()) as Record<string, unknown>;
    const currentMemory = await this.sessionMemory.readMemory(sessionId);
    const scope = await this.sessionMemory.readScope(sessionId);
    const memories = await this.collectMemories(sessionId, session);
    return { core, memories, currentMemory, scope };
  }

  /** 按继承策略收集祖先/兄弟的 memory.md */
  private async collectMemories(sessionId: string, session: SessionMeta): Promise<string[]> {
    switch (this.inheritancePolicy) {
      case 'minimal':
        return [];

      case 'summary': {
        if (!session.parentId) return [];
        const mem = await this.sessionMemory.readMemory(session.parentId);
        return mem ? [mem] : [];
      }

      case 'full': {
        const ancestors = await this.sessions.getAncestors(sessionId);
        const reversed = ancestors.reverse(); // root → parent 顺序
        const results: string[] = [];
        for (const a of reversed) {
          const mem = await this.sessionMemory.readMemory(a.id);
          if (mem) results.push(mem);
        }
        return results;
      }

      case 'scoped': {
        const results: string[] = [];
        // 父的 memory
        if (session.parentId) {
          const parentMem = await this.sessionMemory.readMemory(session.parentId);
          if (parentMem) results.push(parentMem);
        }
        // 同 scope 兄弟的 memory
        if (session.scope) {
          const siblings = await this.sessions.getSiblings(sessionId);
          for (const sib of siblings) {
            if (sib.scope === session.scope) {
              const mem = await this.sessionMemory.readMemory(sib.id);
              if (mem) results.push(mem);
            }
          }
        }
        return results;
      }
    }
  }

  /** 更新父 Session 的 index.md */
  private async updateParentIndex(parentId: string): Promise<void> {
    const parent = await this.sessions.get(parentId);
    if (!parent) return;
    const lines: string[] = [];
    for (const childId of parent.children) {
      const child = await this.sessions.get(childId);
      if (!child) continue;
      const mem = await this.sessionMemory.readMemory(childId);
      const summary = mem?.split('\n')[0] ?? '';
      lines.push(`- **${child.label}**：${summary}`);
    }
    await this.sessionMemory.writeIndex(parentId, lines.join('\n'));
  }

  /** 触发错误事件 */
  private emitError(source: string, err: unknown): void {
    const error = err instanceof Error ? err : new Error(String(err));
    for (const handler of this.errorHandlers) {
      handler({ source, error });
    }
  }
}
