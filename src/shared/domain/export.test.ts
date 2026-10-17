import { describe, expect, it } from 'vitest'
import { toCsv } from './export'
import type { Tx } from './types'

const tx = (id: string, kind: Tx['kind'], title: string, amount: number, at: string, extra: Partial<Tx> = {}): Tx => ({
  id,
  kind,
  title,
  amount,
  note: null,
  createdAt: new Date(at).toISOString(),
  ref: null,
  ...extra,
})

describe('匯出 CSV', () => {
  const txs = [
    tx('a', 'initial', '初始額度', 14520, '2026-10-08T12:00:00+08:00'),
    tx('b', 'spend', '手搖飲, "大杯"', -65, '2026-10-09T12:30:00+08:00'),
    tx('c', 'void', '沖銷：手搖飲', 65, '2026-10-10T09:00:00+08:00', { ref: 'b', note: '記錯了' }),
  ]
  const lines = toCsv(txs).split('\r\n')

  it('開頭有 BOM、標題列正確', () => {
    expect(lines[0]).toBe('\uFEFF"時間","種類","項目","金額","餘額","備註","狀態"')
  })

  it('由舊到新，含餘額與已沖銷標記，逗號與雙引號會被跳脫', () => {
    expect(lines).toHaveLength(4)
    expect(lines[1]).toBe('"2026/10/8 12:00","初始額度","初始額度","14520","14520","",""')
    expect(lines[2]).toBe('"2026/10/9 12:30","消費","手搖飲, ""大杯""","-65","14455","","已沖銷"')
    expect(lines[3]).toBe('"2026/10/10 09:00","沖銷","沖銷：手搖飲","65","14520","記錯了",""')
  })
})
