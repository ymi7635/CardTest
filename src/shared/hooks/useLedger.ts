import { useMemo } from 'react'
import { now } from '../domain/clock'
import { buildRows, statsOf } from '../domain/rules'
import type { Stats, TxRow } from '../domain/types'
import type { CardState } from '../api'
import { useRemoteState, type Remote } from './useRemoteState'

export interface Derived {
  stats: Stats
  /** 由新到舊，含沖銷紀錄 */
  rows: TxRow[]
}

export interface Ledger extends Remote<CardState> {
  derived: Derived | null
  /** 目前時間（開發時可用 ?now= 覆寫） */
  at: Date
}

/** 抓取 CardState 並算出統計與明細列；她的網站和後台共用 */
export function useLedger(load: () => Promise<CardState>, cacheKey: string, watchKey?: string): Ledger {
  const remote = useRemoteState<CardState>(load, cacheKey, watchKey)
  const at = now()
  const txs = remote.data?.transactions
  const derived = useMemo<Derived | null>(() => (txs ? { stats: statsOf(txs, now()), rows: buildRows(txs) } : null), [txs])
  return { ...remote, derived, at }
}

/** 資料已載入之後、各個畫面實際拿到的東西（她的網站與後台共用的部分） */
export interface LoadedLedger {
  state: CardState
  derived: Derived
  /** 她的暱稱；尚未開卡時為空字串 */
  name: string
  at: Date
  offline: boolean
  refreshing: boolean
  refresh: () => Promise<void>
}

/** 確認資料已經載入，並整理成畫面好用的形狀；尚未載入就丟錯（代表畫面放錯位置了） */
export function loaded(ledger: Ledger): LoadedLedger {
  const { data, derived } = ledger
  if (!data || !derived) throw new Error('資料尚未載入：這個畫面必須在載入完成之後才能顯示')
  return {
    state: data,
    derived,
    name: data.profile?.name ?? '',
    at: ledger.at,
    offline: ledger.offline,
    refreshing: ledger.refreshing,
    refresh: ledger.refresh,
  }
}
