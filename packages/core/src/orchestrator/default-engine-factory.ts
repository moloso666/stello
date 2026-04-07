import type { SessionTree } from '../types/session';
import type { MemoryEngine } from '../types/memory';
import type { ConfirmProtocol, SkillRouter } from '../types/lifecycle';
import { FilteredSkillRouter } from '../skill/filtered-skill-router';
import {
  StelloEngineImpl,
  type EngineHooks,
  type EngineLifecycleAdapter,
  type EngineToolRuntime,
} from '../engine/stello-engine';
import type { Scheduler, SchedulerMainSession, SchedulerSession } from '../engine/scheduler';
import type { TurnRunner } from '../engine/turn-runner';
import type { SplitGuard } from '../session/split-guard';
import type { ForkProfileRegistry } from '../engine/fork-profile';
import type { EngineFactory, OrchestratorEngine } from './session-orchestrator';
import type { SessionRuntimeResolver } from '../types/engine';

/** hooks 提供方式 */
export type EngineHookProvider =
  | Partial<EngineHooks>
  | ((sessionId: string) => Partial<EngineHooks>);

/** 默认 EngineFactory 的构造参数 */
export interface DefaultEngineFactoryOptions {
  sessions: SessionTree;
  memory: MemoryEngine;
  skills: SkillRouter;
  confirm: ConfirmProtocol;
  lifecycle: EngineLifecycleAdapter;
  tools: EngineToolRuntime;
  sessionRuntimeResolver: SessionRuntimeResolver;
  splitGuard?: SplitGuard;
  profiles?: ForkProfileRegistry;
  mainSession?: SchedulerMainSession | null;
  turnRunner?: TurnRunner;
  scheduler?: Scheduler;
  hooks?: EngineHookProvider;
}

/**
 * DefaultEngineFactory
 *
 * 负责把 `sessionId` 装配成一个单-session engine。
 * 当有 scheduler 时，构建闭包注入 hooks，Engine 本身不感知调度。
 */
export class DefaultEngineFactory implements EngineFactory {
  constructor(private readonly options: DefaultEngineFactoryOptions) {}

  async create(sessionId: string): Promise<OrchestratorEngine> {
    const session = await this.options.sessionRuntimeResolver.resolve(sessionId);
    const userHooks = this.resolveHooks(sessionId);
    const schedulerHooks = this.buildSchedulerHooks(session);
    const mergedHooks = this.mergeHooks(userHooks, schedulerHooks);
    const skills = await this.resolveSkillRouter(sessionId);

    return new StelloEngineImpl({
      session,
      sessions: this.options.sessions,
      memory: this.options.memory,
      skills,
      confirm: this.options.confirm,
      lifecycle: this.options.lifecycle,
      tools: this.options.tools,
      splitGuard: this.options.splitGuard,
      profiles: this.options.profiles,
      turnRunner: this.options.turnRunner,
      hooks: mergedHooks,
    });
  }

  /** 按 session metadata 中的 _stello.allowedSkills 创建过滤后的 SkillRouter */
  private async resolveSkillRouter(sessionId: string): Promise<SkillRouter> {
    const meta = typeof this.options.sessions.get === 'function'
      ? await this.options.sessions.get(sessionId)
      : null;
    const stelloMeta = meta?.metadata?._stello;

    if (
      !stelloMeta
      || typeof stelloMeta !== 'object'
      || !('allowedSkills' in stelloMeta)
      || !Array.isArray((stelloMeta as Record<string, unknown>).allowedSkills)
    ) {
      return this.options.skills;
    }

    return new FilteredSkillRouter(
      this.options.skills,
      new Set((stelloMeta as { allowedSkills: string[] }).allowedSkills),
    );
  }

  /** 构建 scheduler 闭包 hooks */
  private buildSchedulerHooks(session: SchedulerSession): Partial<EngineHooks> {
    const { scheduler, mainSession } = this.options;
    if (!scheduler) return {};
    return {
      onRoundEnd: () => {
        const nextTurnCount = session.turnCount + 1;
        this.options.sessions.updateMeta(session.id, { turnCount: nextTurnCount }).catch(() => {});
        scheduler.afterTurn(session, mainSession, {
          observedTurnCount: nextTurnCount,
        }).catch(() => {});
      },
      onSessionLeave: () => {
        scheduler.onSessionLeave(session, mainSession).catch(() => {});
      },
      onSessionArchive: () => {
        scheduler.onSessionArchive(session, mainSession).catch(() => {});
      },
    };
  }

  /** 合并用户 hooks 和 scheduler hooks，同一 key 下两者都 fire */
  private mergeHooks(
    userHooks?: Partial<EngineHooks>,
    schedulerHooks?: Partial<EngineHooks>,
  ): Partial<EngineHooks> | undefined {
    if (!userHooks && !schedulerHooks) return undefined;
    if (!userHooks) return schedulerHooks;
    if (!schedulerHooks || Object.keys(schedulerHooks).length === 0) return userHooks;

    const merged: Partial<EngineHooks> = { ...userHooks };
    for (const key of Object.keys(schedulerHooks) as Array<keyof EngineHooks>) {
      const userFn = userHooks[key] as ((ctx: unknown) => Promise<void> | void) | undefined;
      const schedFn = schedulerHooks[key] as ((ctx: unknown) => Promise<void> | void) | undefined;
      if (!schedFn) continue;
      if (!userFn) {
        (merged as Record<string, unknown>)[key] = schedFn;
      } else {
        (merged as Record<string, unknown>)[key] = (ctx: unknown) => {
          userFn(ctx);
          schedFn(ctx);
        };
      }
    }
    return merged;
  }

  private resolveHooks(sessionId: string): Partial<EngineHooks> | undefined {
    const { hooks } = this.options;
    if (!hooks) return undefined;
    return typeof hooks === 'function' ? hooks(sessionId) : hooks;
  }
}
