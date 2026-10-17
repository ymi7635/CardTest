import type { Profile, Tx } from '../domain/types'

export type ApiErrorCode =
  | 'INVALID_TOKEN' // 通行碼錯誤或缺少
  | 'NETWORK' // 連不到伺服器
  | 'INVALID_INPUT'
  | 'INSUFFICIENT' // 餘額不足
  | 'LOCKED' // 卡片鎖定中
  | 'ALREADY_ACTIVATED'
  | 'NOT_ACTIVATED'
  | 'NOT_FOUND'
  | 'ALREADY_VOIDED'
  | 'ALREADY_CLAIMED' // 這項禮物已經兌換過了
  | 'UNKNOWN'

export class ApiError extends Error {
  readonly code: ApiErrorCode
  constructor(code: ApiErrorCode, message?: string) {
    super(message ?? code)
    this.name = 'ApiError'
    this.code = code
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError

/** 她和後台讀到的是同一份資料；餘額由前端依 transactions 加總（資料庫端同樣是加總檢視表） */
export interface CardState {
  activated: boolean
  locked: boolean
  profile: Profile | null
  /** 開卡時間（ISO）；未開卡為 null */
  activatedAt: string | null
  transactions: Tx[]
  /** 伺服器時間（ISO） */
  serverTime: string
}

export interface SpendInput {
  title: string
  amount: number
  /** 由前端產生；同一個 requestId 重送只會扣一次 */
  requestId: string
}

export interface TopupInput {
  amount: number
  note: string
  requestId: string
}

export interface VoidInput {
  txId: string
  reason: string
}

/** 她那一邊可以呼叫的功能（對應資料庫函式） */
export interface CardApi {
  getState(): Promise<CardState>
  activate(profile: Profile): Promise<CardState>
  spend(input: SpendInput): Promise<CardState>
  /** 兌換禮物：不扣額度，每項限一次 */
  claimGift(giftKey: string): Promise<CardState>
  setLock(locked: boolean): Promise<CardState>
  updateProfile(patch: Partial<Profile>): Promise<CardState>
}

/** 後台可以呼叫的功能 */
export interface AdminApi {
  getState(): Promise<CardState>
  topup(input: TopupInput): Promise<CardState>
  voidTx(input: VoidInput): Promise<CardState>
  unlock(): Promise<CardState>
}

export type Role = 'card' | 'admin'
