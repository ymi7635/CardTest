import { diffDays, taipei, taipeiMidnight } from './clock'
import { AMOUNT_MAX, ANNIVERSARY, GIFTS, TITLE_MAX, TOPUP_MAX } from './config'
import type { Stats, Tx, TxKind, TxRow } from './types'

/**
 * 這個檔案是「帳務規則」的唯一來源，全部是純函式。
 * 之後接 Supabase 時，資料庫函式（SQL）必須做出一樣的判斷。
 */

const isCredit = (k: TxKind): boolean => k === 'initial' || k === 'topup' || k === 'anniv'

/** 可以被後台沖銷的種類（初始額度與沖銷本身不行） */
export const isVoidable = (k: TxKind): boolean => k === 'spend' || k === 'topup' || k === 'anniv'

export const balanceOf = (txs: readonly Tx[]): number => txs.reduce((s, t) => s + t.amount, 0)

/** 已被沖銷的交易 id */
export function voidedIds(txs: readonly Tx[]): Set<string> {
  const out = new Set<string>()
  for (const t of txs) if (t.kind === 'void' && t.ref) out.add(t.ref)
  return out
}

const byTime = (a: Tx, b: Tx) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)

/** 由新到舊的明細，每筆附上「發生後的餘額」與是否已被沖銷 */
export function buildRows(txs: readonly Tx[]): TxRow[] {
  const voided = voidedIds(txs)
  let running = 0
  const asc = [...txs].sort(byTime).map((tx) => {
    running += tx.amount
    return { tx, balanceAfter: running, voided: voided.has(tx.id) }
  })
  return asc.reverse()
}

export function statsOf(txs: readonly Tx[], at: Date): Stats {
  const voided = voidedIds(txs)
  const ym = taipei(at).ymd.slice(0, 7)
  const s: Stats = { balance: balanceOf(txs), credit: 0, spent: 0, topups: 0, monthSpent: 0, spendCount: 0 }
  for (const t of txs) {
    if (t.kind === 'void' || voided.has(t.id)) continue
    if (isCredit(t.kind)) s.credit += t.amount
    if (t.kind === 'topup' || t.kind === 'anniv') s.topups += t.amount
    if (t.kind === 'spend') {
      s.spent += -t.amount
      s.spendCount += 1
      if (taipei(new Date(t.createdAt)).ymd.slice(0, 7) === ym) s.monthSpent += -t.amount
    }
  }
  return s
}

export interface MonthGroup {
  key: string
  label: string
  spent: number
  rows: TxRow[]
}

export function groupByMonth(rows: readonly TxRow[]): MonthGroup[] {
  const map = new Map<string, MonthGroup>()
  for (const r of rows) {
    const p = taipei(new Date(r.tx.createdAt))
    const key = p.ymd.slice(0, 7)
    let g = map.get(key)
    if (!g) {
      g = { key, label: `${p.y} 年 ${p.m} 月`, spent: 0, rows: [] }
      map.set(key, g)
    }
    g.rows.push(r)
    if (r.tx.kind === 'spend' && !r.voided) g.spent += -r.tx.amount
  }
  return [...map.values()]
}

// ───────── 紀念日 ─────────

const MMDD = ANNIVERSARY.slice(5) // '11-15'
const START_YEAR = Number(ANNIVERSARY.slice(0, 4))

/** 在一起幾天（以台北日期計） */
export const daysTogether = (at: Date): number => Math.max(0, diffDays(ANNIVERSARY, taipei(at).ymd))

/** 下一個紀念日；今天就是紀念日時 days 為 0 */
export function nextAnniversary(at: Date): { days: number; years: number } {
  const today = taipei(at)
  let y = today.y
  if (`${y}-${MMDD}` < today.ymd) y += 1
  return { days: diffDays(today.ymd, `${y}-${MMDD}`), years: y - START_YEAR }
}

/** 開卡之後、今天（含）之前，還沒發過加值的紀念日年份 */
export function dueAnnivYears(activatedAt: string, at: Date, issued: ReadonlySet<string>): number[] {
  const act = taipei(new Date(activatedAt))
  const today = taipei(at)
  const out: number[] = []
  for (let y = act.y; y <= today.y; y++) {
    const ymd = `${y}-${MMDD}`
    if (ymd > act.ymd && ymd <= today.ymd && !issued.has(String(y))) out.push(y)
  }
  return out
}

/** 紀念日加值紀錄的時間：當年 11/15 台北 00:00 */
export const annivMoment = (year: number): Date => taipeiMidnight(`${year}-${MMDD}`)

// ───────── 禮物 ─────────

/** 已兌換的禮物：禮物代碼 → 兌換時間（禮物紀錄不可沖銷，所以兌換過就是兌換過） */
export function giftClaimTimes(txs: readonly Tx[]): Map<string, string> {
  const out = new Map<string, string>()
  for (const t of txs) if (t.kind === 'gift' && t.ref) out.set(t.ref, t.createdAt)
  return out
}

export const claimedGifts = (txs: readonly Tx[]): Set<string> => new Set(giftClaimTimes(txs).keys())

export type GiftError = 'INVALID_INPUT' | 'LOCKED' | 'ALREADY_CLAIMED'

export function checkGift(key: string, claimed: ReadonlySet<string>, locked: boolean): GiftError | null {
  if (!GIFTS.some((g) => g.key === key)) return 'INVALID_INPUT'
  if (claimed.has(key)) return 'ALREADY_CLAIMED'
  if (locked) return 'LOCKED'
  return null
}

// ───────── 輸入驗證 ─────────

export type RuleError = 'INVALID_INPUT' | 'LOCKED' | 'INSUFFICIENT'

const isMoney = (n: number, max = AMOUNT_MAX): boolean => Number.isInteger(n) && n >= 1 && n <= max

export function checkSpend(input: { title: string; amount: number }, balance: number, locked: boolean): RuleError | null {
  const title = input.title.trim()
  if (!title || title.length > TITLE_MAX || !isMoney(input.amount)) return 'INVALID_INPUT'
  if (locked) return 'LOCKED'
  if (input.amount > balance) return 'INSUFFICIENT'
  return null
}

export function checkTopup(input: { amount: number; note: string }): RuleError | null {
  if (!isMoney(input.amount, TOPUP_MAX) || !input.note.trim() || input.note.trim().length > 40) return 'INVALID_INPUT'
  return null
}

/** 沖銷一筆交易後餘額不能小於 0 */
export function checkVoid(target: Tx, balance: number): RuleError | null {
  return balance - target.amount < 0 ? 'INSUFFICIENT' : null
}
