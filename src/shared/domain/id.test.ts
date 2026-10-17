import { afterEach, describe, expect, it, vi } from 'vitest'
import { uid } from './id'

const realCrypto = globalThis.crypto
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

afterEach(() => vi.unstubAllGlobals())

describe('uid', () => {
  it('有 randomUUID 時直接使用', () => {
    expect(uid()).toMatch(UUID)
  })

  it('沒有 randomUUID（非安全環境）時改用 getRandomValues，格式仍是 UUID v4 且不重複', () => {
    vi.stubGlobal('crypto', { getRandomValues: (a: Uint8Array<ArrayBuffer>) => realCrypto.getRandomValues(a) })
    const a = uid()
    expect(a).toMatch(UUID)
    expect(uid()).not.toBe(a)
  })

  it('連 crypto 都沒有也不會丟錯', () => {
    vi.stubGlobal('crypto', undefined)
    expect(uid().length).toBeGreaterThan(8)
  })
})
