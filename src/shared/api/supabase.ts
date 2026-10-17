import type { Profile } from '../domain/types'
import { ApiError, type AdminApi, type ApiErrorCode, type CardApi, type CardState } from './types'

/**
 * Supabase 實作：所有操作都是呼叫資料庫函式（supabase/schema.sql 裡的 public.card_* / admin_*），
 * 透過 Supabase 的 REST 介面（PostgREST）：POST {url}/rest/v1/rpc/{函式名}。
 * 不需要 supabase-js：我們只用得到「呼叫函式」這一件事。
 *
 * 錯誤約定：資料庫函式用 raise exception '錯誤代碼' 回報，PostgREST 會回 400 與 { message: '錯誤代碼' }。
 */

export interface SupabaseConfig {
  url: string
  anonKey: string
  /** 毫秒；超過就當作連線失敗 */
  timeoutMs?: number
  /** 測試時可以換成假的 fetch */
  fetchImpl?: typeof fetch
}

const KNOWN: ReadonlySet<string> = new Set<ApiErrorCode>([
  'INVALID_TOKEN',
  'INVALID_INPUT',
  'INSUFFICIENT',
  'LOCKED',
  'ALREADY_ACTIVATED',
  'NOT_ACTIVATED',
  'NOT_FOUND',
  'ALREADY_VOIDED',
  'ALREADY_CLAIMED',
])

function createRpc({ url, anonKey, timeoutMs = 15_000, fetchImpl }: SupabaseConfig) {
  const base = url.replace(/\/+$/, '')
  // 舊版 anon 金鑰是 JWT（eyJ 開頭），要同時放在 Authorization；新版 publishable 金鑰只需要 apikey
  const headers: Record<string, string> = { 'Content-Type': 'application/json', apikey: anonKey }
  if (anonKey.startsWith('eyJ')) headers.Authorization = `Bearer ${anonKey}`

  return async function rpc(fn: string, args: Record<string, unknown>): Promise<CardState> {
    const doFetch = fetchImpl ?? fetch
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    let res: Response
    try {
      res = await doFetch(`${base}/rest/v1/rpc/${fn}`, { method: 'POST', headers, body: JSON.stringify(args), signal: ctrl.signal })
    } catch {
      throw new ApiError('NETWORK')
    } finally {
      clearTimeout(timer)
    }

    if (!res.ok) {
      let message = ''
      try {
        message = ((await res.json()) as { message?: string }).message ?? ''
      } catch {
        /* 不是 JSON 就當作未知錯誤 */
      }
      if (KNOWN.has(message)) throw new ApiError(message as ApiErrorCode)
      // 閘道逾時、伺服器暫時掛掉（含專案被暫停）：當作連線失敗，畫面會顯示離線並保留快取
      if (res.status >= 500 || res.status === 0) throw new ApiError('NETWORK')
      throw new ApiError('UNKNOWN', message || `HTTP ${res.status}`)
    }

    try {
      return (await res.json()) as CardState
    } catch {
      throw new ApiError('UNKNOWN', '伺服器回傳的格式不正確')
    }
  }
}

/** 沒有通行碼：每個操作都直接當作連結無效，不必打擾伺服器 */
const noToken = async (): Promise<never> => {
  throw new ApiError('INVALID_TOKEN')
}

export function createSupabaseCardApi(token: string | null, config: SupabaseConfig): CardApi {
  if (!token) {
    return { getState: noToken, activate: noToken, spend: noToken, claimGift: noToken, setLock: noToken, updateProfile: noToken }
  }
  const rpc = createRpc(config)
  return {
    getState: () => rpc('card_state', { p_token: token }),
    activate: (profile: Profile) => rpc('card_activate', { p_token: token, p_profile: profile }),
    spend: ({ title, amount, requestId }) =>
      rpc('card_spend', { p_token: token, p_title: title, p_amount: amount, p_request_id: requestId }),
    claimGift: (giftKey) => rpc('card_claim_gift', { p_token: token, p_gift_key: giftKey }),
    setLock: (locked) => rpc('card_set_lock', { p_token: token, p_locked: locked }),
    updateProfile: (patch) => rpc('card_update_profile', { p_token: token, p_patch: patch }),
  }
}

export function createSupabaseAdminApi(token: string | null, config: SupabaseConfig): AdminApi {
  if (!token) {
    return { getState: noToken, topup: noToken, voidTx: noToken, unlock: noToken }
  }
  const rpc = createRpc(config)
  return {
    getState: () => rpc('admin_state', { p_token: token }),
    topup: ({ amount, note, requestId }) => rpc('admin_topup', { p_token: token, p_amount: amount, p_note: note, p_request_id: requestId }),
    voidTx: ({ txId, reason }) => rpc('admin_void', { p_token: token, p_tx_id: txId, p_reason: reason }),
    unlock: () => rpc('admin_unlock', { p_token: token }),
  }
}
