import type pg from 'pg'
import type {
  SessionCompatibleConsolidateFn,
  SessionCompatibleIntegrateFn,
} from '@stello-ai/core'

/** 最小 LLM 调用接口，仅用于 consolidation/integration 内置默认实现 */
export type LLMCallFn = (
  messages: Array<{ role: string; content: string }>,
) => Promise<string>

/** 从 session_data 读取 per-session prompt，不存在返回 null */
async function getSessionPrompt(
  pool: pg.Pool,
  spaceId: string,
  sessionId: string,
  key: string,
): Promise<string | null> {
  const { rows } = await pool.query(
    `SELECT sd.content FROM session_data sd
     JOIN sessions s ON s.id = sd.session_id
     WHERE s.space_id = $1 AND sd.session_id = $2 AND sd.key = $3`,
    [spaceId, sessionId, key],
  )
  return (rows[0]?.['content'] as string) ?? null
}

/** 创建 per-session consolidateFn：查 per-session prompt → fallback space prompt → 调 LLM */
export function createDefaultConsolidateFn(
  sessionId: string,
  spacePrompt: string | null,
  llm: LLMCallFn,
  pool: pg.Pool,
  spaceId: string,
): SessionCompatibleConsolidateFn {
  return async (currentMemory, messages) => {
    const prompt = await getSessionPrompt(pool, spaceId, sessionId, 'consolidate_prompt')
      ?? spacePrompt
    if (!prompt) return currentMemory ?? ''

    const parts: string[] = []
    if (currentMemory) {
      parts.push(`当前摘要:\n${currentMemory}`)
    }
    parts.push(
      `对话记录:\n${messages.map((m) => `${m.role}: ${m.content}`).join('\n')}`,
    )
    return llm([
      { role: 'system', content: prompt },
      { role: 'user', content: parts.join('\n\n') },
    ])
  }
}

/** 创建 per-session integrateFn：查 per-session prompt → fallback space prompt → 调 LLM */
export function createDefaultIntegrateFn(
  mainSessionId: string,
  spacePrompt: string | null,
  llm: LLMCallFn,
  pool: pg.Pool,
  spaceId: string,
): SessionCompatibleIntegrateFn {
  return async (children, currentSynthesis) => {
    const prompt = await getSessionPrompt(pool, spaceId, mainSessionId, 'integrate_prompt')
      ?? spacePrompt
    if (!prompt) {
      return { synthesis: currentSynthesis ?? '', insights: [] }
    }

    const parts: string[] = []
    if (currentSynthesis) {
      parts.push(`当前综合:\n${currentSynthesis}`)
    }
    parts.push(
      `子 Session 摘要:\n${children.map((c) => `- ${c.label}: ${c.l2}`).join('\n')}`,
    )
    const result = await llm([
      { role: 'system', content: prompt },
      { role: 'user', content: parts.join('\n\n') },
    ])
    return JSON.parse(result) as {
      synthesis: string
      insights: Array<{ sessionId: string; content: string }>
    }
  }
}
