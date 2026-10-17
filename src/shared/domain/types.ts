import type { ProfileKey } from './config'

/**
 * 流水帳種類：
 *  initial 開卡初始額度　spend 消費　topup 後台儲值　anniv 紀念日自動加值　gift 兌換禮物（金額 0，ref 是禮物代碼）　void 沖銷（金額為被沖銷那筆的相反數）
 */
export type TxKind = 'initial' | 'spend' | 'topup' | 'anniv' | 'gift' | 'void'

export interface Tx {
  id: string
  kind: TxKind
  /** 項目名稱（建立當下的快照） */
  title: string
  /** 有正負：儲值為正、消費為負 */
  amount: number
  /** 儲值備註、沖銷原因 */
  note: string | null
  /** ISO 字串（UTC） */
  createdAt: string
  /** void：被沖銷的那筆 id；anniv：年份；gift：禮物代碼 */
  ref: string | null
}

export type Profile = Record<ProfileKey, string>

/** 一筆明細加上算好的資訊（列表用） */
export interface TxRow {
  tx: Tx
  /** 這筆發生後的餘額 */
  balanceAfter: number
  /** 這筆已被沖銷 */
  voided: boolean
}

export interface Stats {
  balance: number
  /** 總額度：初始額度＋儲值＋紀念日加值（不含已沖銷） */
  credit: number
  /** 累計支出 */
  spent: number
  /** 累計儲值（含紀念日加值） */
  topups: number
  /** 本月支出 */
  monthSpent: number
  /** 消費筆數 */
  spendCount: number
}
