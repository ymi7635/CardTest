import { vi } from 'vitest'
import { runContract, type Harness } from './contract'
import { createMockAdminApi, createMockCardApi } from './mock'

// vitest 預設是 node 環境，沒有 localStorage，這裡用一個最小的替身
const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
})

const mockHarness = async (): Promise<Harness> => ({
  async reset() {
    store.clear()
    vi.useFakeTimers({ toFake: ['Date'] })
  },
  async setNow(iso) {
    vi.setSystemTime(new Date(iso))
  },
  dispose: () => vi.useRealTimers(),
  card: (t = 'ok') => createMockCardApi(t === 'ok' ? 'demo-card' : 'nope'),
  admin: (t = 'ok') => createMockAdminApi(t === 'ok' ? 'demo-admin' : t === 'card' ? 'demo-card' : 'nope'),
})

runContract('本機模擬後端', mockHarness)
