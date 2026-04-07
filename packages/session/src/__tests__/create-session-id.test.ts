import { describe, it, expect } from 'vitest'
import { createSession } from '../create-session'
import { InMemoryStorageAdapter } from '../mocks/in-memory-storage.js'

describe('createSession 自定义 id', () => {
  it('指定 id 时使用该 id', async () => {
    const storage = new InMemoryStorageAdapter()
    const session = await createSession({
      id: 'custom-id-123',
      storage,
      label: 'test',
    })
    expect(session.meta.id).toBe('custom-id-123')
  })

  it('不指定 id 时自动生成 UUID', async () => {
    const storage = new InMemoryStorageAdapter()
    const session = await createSession({ storage, label: 'test' })
    expect(session.meta.id).toMatch(/^[0-9a-f-]{36}$/)
  })
})
