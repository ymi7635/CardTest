import { fullDateTime } from './format'
import { buildRows } from './rules'
import type { Tx } from './types'

const KIND_LABEL = { initial: '初始額度', spend: '消費', topup: '儲值', anniv: '紀念日加值', gift: '禮物兌換', void: '沖銷' } as const

const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`

/** 全部明細（由舊到新）轉成 CSV；開頭加 BOM，Excel 才不會把中文讀成亂碼 */
export function toCsv(txs: readonly Tx[]): string {
  const rows = buildRows(txs).reverse()
  const head = ['時間', '種類', '項目', '金額', '餘額', '備註', '狀態']
  const lines = rows.map(({ tx, balanceAfter, voided }) =>
    [fullDateTime(tx.createdAt), KIND_LABEL[tx.kind], tx.title, tx.amount, balanceAfter, tx.note ?? '', voided ? '已沖銷' : '']
      .map(cell)
      .join(','),
  )
  return '﻿' + [head.map(cell).join(','), ...lines].join('\r\n')
}

export function downloadText(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
