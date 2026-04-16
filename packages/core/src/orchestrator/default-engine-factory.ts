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
  turnRunner?: TurnRunner;
  hooks?: EngineHookProvider;
}

/**
 * DefaultEngineFactory
 *
 * 负责把 `sessionId` 装配成一个单-session engine。
 */
export class DefaultEngineFactory implements EngineFactory {
  constructor(private readonly options: DefaultEngineFactoryOptions) {}

  async create(sessionId: string): Promise<OrchestratorEngine> {
    const session = await this.options.sessionRuntimeResolver.resolve(sessionId);
    const userHooks = this.resolveHooks(sessionId);
    const mergedHooks = userHooks;
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

  private resolveHooks(sessionId: string): Partial<EngineHooks> | undefined {
    const { hooks } = this.options;
    if (!hooks) return undefined;
    return typeof hooks === 'function' ? hooks(sessionId) : hooks;
  }
}
