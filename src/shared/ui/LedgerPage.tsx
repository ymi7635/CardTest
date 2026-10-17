import { useMemo, useRef, useState, type ReactNode } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { fmt } from '../domain/format'
import { groupByMonth } from '../domain/rules'
import type { TxRow } from '../domain/types'
import Empty from './Empty'
import Icon from './Icon'
import Page from './Page'
import TxItem from './TxItem'

interface Props<Filter extends string> {
  eyebrow: string
  title: string
  filters: { key: Filter; label: string }[]
  /** 這一列在目前的篩選下要不要顯示 */
  matches: (row: TxRow, filter: Filter) => boolean
  /** 由新到舊的全部明細列 */
  rows: TxRow[]
  now: Date
  refreshing: boolean
  onRefresh: () => void
  emptyText: (filter: Filter) => string
  /** 每一列右側的操作（例如後台的沖銷按鈕） */
  renderAction?: (row: TxRow) => ReactNode
  /** 列表下方的額外內容 */
  footer?: ReactNode
}

/** 明細頁：篩選、依月份分組、每月支出小計。她的網站與後台共用，差別只在篩選與操作。 */
export default function LedgerPage<Filter extends string>({
  eyebrow,
  title,
  filters,
  matches,
  rows,
  now,
  refreshing,
  onRefresh,
  emptyText,
  renderAction,
  footer,
}: Props<Filter>) {
  const [filter, setFilter] = useState<Filter>(filters[0].key)
  const list = useRef<HTMLDivElement>(null)

  const groups = useMemo(() => groupByMonth(rows.filter((row) => matches(row, filter))), [rows, filter, matches])

  // 切換篩選時，列表重新浮現
  useGSAP(
    () => {
      gsap.from('.tx', { y: 20, autoAlpha: 0, stagger: 0.03, duration: 0.5, ease: 'expo.out', clearProps: 'transform,opacity,visibility' })
    },
    { scope: list, dependencies: [filter], revertOnUpdate: true },
  )

  return (
    <Page>
      <div className="page-head with-action">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
        </div>
        <button className={`icon-btn ${refreshing ? 'spin' : ''}`} onClick={onRefresh} aria-label="重新整理">
          <Icon name="refresh" />
        </button>
      </div>

      <div className="chips">
        {filters.map((f) => (
          <button key={f.key} className={filter === f.key ? 'on' : ''} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      <div ref={list}>
        {groups.length ? (
          groups.map((group) => (
            <section className="month" key={group.key}>
              <header className="month-head">
                <h3>{group.label}</h3>
                {group.spent > 0 && <span>支出 NT$ {fmt(group.spent)}</span>}
              </header>
              <div className="tx-list">
                {group.rows.map((row) => (
                  <TxItem key={row.tx.id} row={row} now={now} action={renderAction?.(row)} />
                ))}
              </div>
            </section>
          ))
        ) : (
          <Empty text={emptyText(filter)} />
        )}
      </div>

      {footer}
    </Page>
  )
}
