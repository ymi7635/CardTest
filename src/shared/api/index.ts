import { createMockAdminApi, createMockCardApi, mockDev } from './mock'
import { createSupabaseAdminApi, createSupabaseCardApi, type SupabaseConfig } from './supabase'
import { ApiError, type AdminApi, type CardApi, type Role } from './types'

export * from './types'

/**
 * 通行碼：網址的 ?k=...。第一次帶進來就存進 localStorage，
 * 之後即使網址沒有 k（例如從主畫面圖示開啟）也能繼續使用；瀏覽器資料被清掉時重開原連結即可恢復。
 */
function resolveToken(role: Role): string | null {
  const key = `anniv-token-${role}`
  try {
    const fromUrl = new URLSearchParams(location.search).get('k')
    if (fromUrl) {
      localStorage.setItem(key, fromUrl)
      return fromUrl
    }
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/**
 * 資料來源由環境變數決定（見 .env.example）：
 *   VITE_API_MODE=mock      本機模擬（開發時的預設，不需要任何設定）
 *   VITE_API_MODE=supabase  連到 Supabase，需要 VITE_SUPABASE_URL 與 VITE_SUPABASE_ANON_KEY
 */
const mode: string = import.meta.env.VITE_API_MODE ?? 'mock'

/** 設定錯誤時不要讓整個畫面當掉：印出原因到 console，所有操作都回報失敗（畫面顯示「目前無法連線」） */
function broken<T extends object>(message: string): T {
  console.error(`[設定錯誤] ${message}`)
  return new Proxy({}, { get: () => async () => Promise.reject(new ApiError('UNKNOWN', message)) }) as T
}

function setup<T extends object>(make: { mock: () => T; supabase: (c: SupabaseConfig) => T }): T {
  if (mode === 'mock') {
    // 正式版如果忘了設定環境變數，會默默用瀏覽器的模擬資料，等於資料不會真的存起來——寧可明確失敗
    if (import.meta.env.PROD && !import.meta.env.VITE_ALLOW_MOCK) {
      return broken('正式版必須設定 VITE_API_MODE=supabase（見 .env.example），否則資料不會存到資料庫')
    }
    return make.mock()
  }
  if (mode === 'supabase') {
    const url = import.meta.env.VITE_SUPABASE_URL
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
    if (!url || !anonKey) return broken('VITE_API_MODE=supabase 時必須設定 VITE_SUPABASE_URL 與 VITE_SUPABASE_ANON_KEY')
    return make.supabase({ url, anonKey })
  }
  return broken(`未支援的 VITE_API_MODE：${mode}`)
}

export function createCardApi(): CardApi {
  const token = resolveToken('card')
  return setup<CardApi>({ mock: () => createMockCardApi(token), supabase: (c) => createSupabaseCardApi(token, c) })
}

export function createAdminApi(): AdminApi {
  const token = resolveToken('admin')
  return setup<AdminApi>({ mock: () => createMockAdminApi(token), supabase: (c) => createSupabaseAdminApi(token, c) })
}

/** 其他分頁寫入模擬資料庫時（localStorage 的 storage 事件）要重新抓資料；連 Supabase 時不需要 */
export const WATCH_KEY = mode === 'mock' ? mockDev.DB_KEY : '__none__'

if (import.meta.env.DEV && mode === 'mock') {
  ;(window as unknown as { __mock: typeof mockDev }).__mock = mockDev
}
