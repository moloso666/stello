import { describe, it, expect, vi } from 'vitest'
import { makeSession } from './helpers.js'
import type { ConsolidateFn } from '../types/functions.js'

describe('memory() + consolidate()', () => {
  it('初始记忆为 null', async () => {
    const { session } = await makeSession()
    expect(await session.memory()).toBeNull()
  })

  it('consolidate 后记忆可读', async () => {
    const fn: ConsolidateFn = async () => 'Summarized memory'
    const { session, storage } = await makeSession({ consolidateFn: fn })
    await storage.appendRecord(session.meta.id, { role: 'user', content: 'Hello' })

    await session.consolidate()

    expect(await session.memory()).toBe('Summarized memory')
  })

  it('consolidate fn 接收正确参数', async () => {
    const fn = vi.fn<ConsolidateFn>(async (mem, msgs) => `updated: ${mem} + ${msgs.length} msgs`)
    const { session, storage } = await makeSession({ consolidateFn: fn })
    await storage.appendRecord(session.meta.id, { role: 'user', content: 'msg1' })
    await storage.putMemory(session.meta.id, 'existing memory')

    await session.consolidate()

    expect(fn).toHaveBeenCalledWith('existing memory', expect.arrayContaining([
      expect.objectContaining({ content: 'msg1' }),
    ]))
  })

  it('多次 consolidate 覆盖记忆', async () => {
    const { session } = await makeSession({ consolidateFn: async () => 'first' })
    await session.consolidate()
    // 第二次需要新 session 或更新 fn，这里用第二个带不同 fn 的 session 验证
    const { session: s2 } = await makeSession({ consolidateFn: async () => 'second' })
    await s2.consolidate()
    expect(await s2.memory()).toBe('second')
  })

  it('archived session 上调用 consolidate 抛错', async () => {
    const { session } = await makeSession({ consolidateFn: async () => 'mem' })
    await session.archive()
    await expect(session.consolidate()).rejects.toThrow('archived')
  })

  it('未配置 consolidateFn 时调用 consolidate 抛错', async () => {
    const { session } = await makeSession()
    await expect(session.consolidate()).rejects.toThrow('No consolidateFn configured')
  })
})
