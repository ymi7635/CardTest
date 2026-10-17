import type { ReactNode } from 'react'
import { dateLabel, fmt, signed } from '../domain/format'
import type { TxKind, TxRow } from '../domain/types'
import Icon, { type IconName } from './Icon'

const KIND_ICON: Record<TxKind, IconName> = {
  spend: 'bag',
  initial: 'star',
  topup: 'wallet',
  anniv: 'sparkle',
  gift: 'gift',
  void: 'undo',
}

const KIND_TAG: Partial<Record<TxKind, string>> = {
  initial: '開卡禮',
  topup: '儲值',
  anniv: '紀念日加值',
  gift: '禮物兌換',
  void: '沖銷',
}

interface Props {
  row: TxRow
  now: Date
  /** 顯示這筆發生後的餘額 */
  showBalance?: boolean
  /** 右側額外的操作（例如後台的沖銷按鈕） */
  action?: ReactNode
}

/** 一筆明細：她的網站與後台共用 */
export default function TxItem({ row, now, showBalance = true, action }: Props) {
  const { tx, voided, balanceAfter } = row
  const tag = KIND_TAG[tx.kind]
  const isGift = tx.kind === 'gift'

  return (
    <div className={`tx glass ${voided ? 'is-voided' : ''} ${tx.kind === 'void' ? 'is-void-entry' : ''}`}>
      <span className={`tx-ic k-${tx.kind}`}>
        <Icon name={KIND_ICON[tx.kind]} />
      </span>
      <div className="tx-body">
        <b>{tx.title}</b>
        <small>
          {dateLabel(tx.createdAt, now)}
          {tag && <em className={`tag k-${tx.kind}`}>{tag}</em>}
          {voided && <em className="tag k-voided">已沖銷</em>}
        </small>
        {tx.note && <small className="tx-note">{tx.kind === 'void' ? `原因：${tx.note}` : `備註：${tx.note}`}</small>}
      </div>
      <div className="tx-amt">
        {isGift ? (
          <span className="amt gift">禮物</span>
        ) : (
          <span className={`amt ${tx.amount > 0 ? 'plus' : ''}`}>{signed(tx.amount)}</span>
        )}
        {showBalance && !voided && !isGift && <small>餘額 {fmt(balanceAfter)}</small>}
        {action}
      </div>
    </div>
  )
}
