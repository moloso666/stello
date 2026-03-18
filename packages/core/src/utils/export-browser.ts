// ─── 浏览器端数据导出辅助 ───

import type { SessionMeta } from '../types/session';
import type { SessionTreeImpl } from '../session/session-tree';
import type { SessionMemory } from '../memory/session-memory';
import type { CoreMemory } from '../memory/core-memory';

/** 浏览器端需要的完整数据快照 */
export interface BrowserExport {
  core: Record<string, unknown>;
  sessions: SessionMeta[];
  memories: Record<string, string | null>;
}

/** 一次性导出所有数据给浏览器（sessions + memories + core） */
export async function exportForBrowser(
  sessions: SessionTreeImpl,
  sessionMemory: SessionMemory,
  coreMemory: CoreMemory,
): Promise<BrowserExport> {
  const allSessions = await sessions.listAll();
  const core = (await coreMemory.readCore()) as Record<string, unknown>;
  const memories: Record<string, string | null> = {};
  for (const s of allSessions) {
    memories[s.id] = await sessionMemory.readMemory(s.id);
  }
  return { core, sessions: allSessions, memories };
}
