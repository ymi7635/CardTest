import { isApiError, type ApiErrorCode } from './types'

export type ErrorMessages = Partial<Record<ApiErrorCode, string>>

/** 每個錯誤代碼共通的預設說明；各畫面可以用自己的 messages 覆蓋 */
const DEFAULT_MESSAGES: ErrorMessages = {
  NETWORK: '網路不穩，請稍後再試',
  LOCKED: '卡片已鎖定，請先解鎖',
  INSUFFICIENT: '額度不足',
}

/** 把任何錯誤轉成要顯示給人看的文字：先找畫面自己的說明，其次是共通說明，最後用 fallback */
export function errorText(e: unknown, messages: ErrorMessages, fallback: string): string {
  if (!isApiError(e)) return fallback
  return messages[e.code] ?? DEFAULT_MESSAGES[e.code] ?? fallback
}
