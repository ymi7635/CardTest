import { describe, expect, it } from 'vitest'
import {
  balanceOf,
  claimedGifts,
  buildRows,
  checkGift,
  checkSpend,
  checkTopup,
  checkVoid,
  daysTogether,
  giftClaimTimes,
  dueAnnivYears,
  groupByMonth,
  nextAnniversary,
  statsOf,
  voidedIds,
} from './rules'
import type { Tx } from './types'

let n = 0
const tx = (kind: Tx['kind'], amount: number, at: string, extra: Partial<Tx> = {}): Tx => ({
  id: `t${++n}`,
  kind,
  title: kind,
  amount,
  note: null,
  createdAt: new Date(at).toISOString(),
  ref: null,
  ...extra,
})

describe('餘額與沖銷', () => {
  const init = tx('initial', 14520, '2026-10-08T12:00:00+08:00')
  const spend = tx('spend', -680, '2026-10-09T12:00:00+08:00')
  const voidIt = tx('void', 680, '2026-10-10T12:00:00+08:00', { ref: spend.id })

  it('餘額 = 全部金額加總', () => {
    expect(balanceOf([init, spend])).toBe(13840)
    expect(balanceOf([init, spend, voidIt])).toBe(14520)
  })

  it('找出被沖銷的交易', () => {
    expect(voidedIds([init, spend, voidIt])).toEqual(new Set([spend.id]))
  })

  it('明細由新到舊，附上發生後的餘額與沖銷標記', () => {
    const rows = buildRows([spend, init, voidIt]) // 故意亂序
    expect(rows.map((r) => r.tx.kind)).toEqual(['void', 'spend', 'initial'])
    expect(rows.map((r) => r.balanceAfter)).toEqual([14520, 13840, 14520])
    expect(rows.find((r) => r.tx.id === spend.id)?.voided).toBe(true)
  })

  it('統計不計入已沖銷的交易', () => {
    const topup = tx('topup', 1000, '2026-10-11T12:00:00+08:00')
    const s = statsOf([init, spend, voidIt, topup], new Date('2026-10-12T12:00:00+08:00'))
    expect(s).toEqual({ balance: 15520, credit: 15520, spent: 0, topups: 1000, monthSpent: 0, spendCount: 0 })
  })

  it('本月支出只算本月（台北時間）的未沖銷消費', () => {
    const a = tx('spend', -100, '2026-10-31T23:30:00+08:00')
    const b = tx('spend', -200, '2026-11-01T00:30:00+08:00')
    const s = statsOf([init, a, b], new Date('2026-11-05T12:00:00+08:00'))
    expect(s.spent).toBe(300)
    expect(s.monthSpent).toBe(200)
  })
})

describe('依月份分組', () => {
  it('每組統計當月未沖銷的支出', () => {
    const a = tx('spend', -100, '2026-10-02T12:00:00+08:00')
    const b = tx('spend', -50, '2026-11-02T12:00:00+08:00')
    const v = tx('void', 50, '2026-11-03T12:00:00+08:00', { ref: b.id })
    const groups = groupByMonth(buildRows([a, b, v]))
    expect(groups.map((g) => [g.key, g.spent])).toEqual([
      ['2026-11', 0],
      ['2026-10', 100],
    ])
    expect(groups[0].label).toBe('2026 年 11 月')
  })
})

describe('紀念日', () => {
  it('在一起的天數（台北日期）', () => {
    expect(daysTogether(new Date('2026-10-08T12:00:00+08:00'))).toBe(1423)
    expect(daysTogether(new Date('2022-11-15T00:00:00+08:00'))).toBe(0)
  })

  it('倒數天數與週年數', () => {
    expect(nextAnniversary(new Date('2026-10-08T12:00:00+08:00'))).toEqual({ days: 38, years: 4 })
    expect(nextAnniversary(new Date('2026-11-15T09:00:00+08:00'))).toEqual({ days: 0, years: 4 })
    expect(nextAnniversary(new Date('2026-11-16T09:00:00+08:00'))).toEqual({ days: 364, years: 5 })
  })

  it('加值只發開卡之後的紀念日，每年一次', () => {
    const act = new Date('2026-10-08T12:00:00+08:00').toISOString()
    const due = (at: string, issued: string[] = []) => dueAnnivYears(act, new Date(at), new Set(issued))
    expect(due('2026-11-14T23:59:00+08:00')).toEqual([])
    expect(due('2026-11-15T00:00:00+08:00')).toEqual([2026])
    expect(due('2026-11-15T12:00:00+08:00', ['2026'])).toEqual([])
    expect(due('2028-01-01T12:00:00+08:00')).toEqual([2026, 2027])
    expect(due('2028-01-01T12:00:00+08:00', ['2026'])).toEqual([2027])
  })

  it('開卡當天剛好是紀念日，當天不發（要隔年）', () => {
    const act = new Date('2026-11-15T10:00:00+08:00').toISOString()
    expect(dueAnnivYears(act, new Date('2026-11-15T12:00:00+08:00'), new Set())).toEqual([])
    expect(dueAnnivYears(act, new Date('2027-11-15T12:00:00+08:00'), new Set())).toEqual([2027])
  })
})

describe('輸入驗證', () => {
  it('消費', () => {
    expect(checkSpend({ title: '手搖飲', amount: 65 }, 100, false)).toBeNull()
    expect(checkSpend({ title: '  ', amount: 65 }, 100, false)).toBe('INVALID_INPUT')
    expect(checkSpend({ title: 'x'.repeat(21), amount: 65 }, 100, false)).toBe('INVALID_INPUT')
    expect(checkSpend({ title: '手搖飲', amount: 0 }, 100, false)).toBe('INVALID_INPUT')
    expect(checkSpend({ title: '手搖飲', amount: 1.5 }, 100, false)).toBe('INVALID_INPUT')
    expect(checkSpend({ title: '手搖飲', amount: -5 }, 100, false)).toBe('INVALID_INPUT')
    expect(checkSpend({ title: '手搖飲', amount: 65 }, 100, true)).toBe('LOCKED')
    expect(checkSpend({ title: '手搖飲', amount: 101 }, 100, false)).toBe('INSUFFICIENT')
    expect(checkSpend({ title: '手搖飲', amount: 100 }, 100, false)).toBeNull()
  })

  it('儲值：上限 50,000、備註必填', () => {
    expect(checkTopup({ amount: 1000, note: '生日' })).toBeNull()
    expect(checkTopup({ amount: 50000, note: '生日' })).toBeNull()
    expect(checkTopup({ amount: 50001, note: '生日' })).toBe('INVALID_INPUT')
    expect(checkTopup({ amount: 1000, note: ' ' })).toBe('INVALID_INPUT')
  })

  it('沖銷儲值不能讓餘額變負', () => {
    const t = tx('topup', 1000, '2026-10-11T12:00:00+08:00')
    expect(checkVoid(t, 1000)).toBeNull()
    expect(checkVoid(t, 999)).toBe('INSUFFICIENT')
    const s = tx('spend', -500, '2026-10-11T12:00:00+08:00')
    expect(checkVoid(s, 0)).toBeNull() // 沖銷消費 = 退款，餘額只會變多
  })
})

describe('禮物', () => {
  it('只能兌換清單裡的禮物、每項一次、鎖卡時不能兌換', () => {
    expect(checkGift('anniv4-gift', new Set(), false)).toBeNull()
    expect(checkGift('nope', new Set(), false)).toBe('INVALID_INPUT')
    expect(checkGift('anniv4-gift', new Set(['anniv4-gift']), false)).toBe('ALREADY_CLAIMED')
    expect(checkGift('anniv4-letter', new Set(['anniv4-gift']), false)).toBeNull()
    expect(checkGift('anniv4-gift', new Set(), true)).toBe('LOCKED')
  })

  it('已兌換的禮物由明細推算，不影響餘額與統計', () => {
    const g = tx('gift', 0, '2026-10-09T12:00:00+08:00', { ref: 'anniv4-gift' })
    const init = tx('initial', 14520, '2026-10-08T12:00:00+08:00')
    expect(claimedGifts([init, g])).toEqual(new Set(['anniv4-gift']))
    expect(statsOf([init, g], new Date('2026-10-10T12:00:00+08:00'))).toEqual({
      balance: 14520,
      credit: 14520,
      spent: 0,
      topups: 0,
      monthSpent: 0,
      spendCount: 0,
    })
  })
})

describe('giftClaimTimes', () => {
  it('禮物代碼 → 兌換時間，只算禮物紀錄', () => {
    const g1 = tx('gift', 0, '2026-10-09T12:00:00+08:00', { ref: 'anniv4-gift' })
    const g2 = tx('gift', 0, '2026-10-10T12:00:00+08:00', { ref: 'anniv4-letter' })
    const spend = tx('spend', -10, '2026-10-11T12:00:00+08:00', { ref: 'anniv4-gift' }) // 即使 ref 相同，不是禮物就不算
    const times = giftClaimTimes([g1, g2, spend])
    expect([...times.keys()]).toEqual(['anniv4-gift', 'anniv4-letter'])
    expect(times.get('anniv4-gift')).toBe(g1.createdAt)
  })
})
