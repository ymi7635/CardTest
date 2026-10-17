import { downloadText, toCsv } from '../../shared/domain/export'
import { isVoidable } from '../../shared/domain/rules'
import type { TxKind, TxRow } from '../../shared/domain/types'
import Icon from '../../shared/ui/Icon'
import LedgerPage from '../../shared/ui/LedgerPage'
import { useUI } from '../../shared/ui/UIProvider'
import { useAdminData } from '../data'
import VoidSheet from '../sheets/VoidSheet'

type Filter = 'all' | Extract<TxKind, 'spend' | 'topup' | 'anniv' | 'gift'>

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'spend', label: '消費' },
  { key: 'topup', label: '儲值' },
  { key: 'anniv', label: '自動加值' },
  { key: 'gift', label: '禮物' },
]

const matches = ({ tx }: TxRow, filter: Filter) => filter === 'all' || tx.kind === filter

export default function History() {
  const { state, derived, at, refresh, refreshing } = useAdminData()
  const { openSheet, toast } = useUI()

  const exportCsv = () => {
    if (!state.transactions.length) return toast('目前沒有可以匯出的紀錄')
    downloadText(`card-transactions-${at.toISOString().slice(0, 10)}.csv`, toCsv(state.transactions))
    toast('已匯出備份檔')
  }

  return (
    <LedgerPage
      eyebrow="LEDGER"
      title="明細"
      filters={FILTERS}
      matches={matches}
      rows={derived.rows}
      now={at}
      refreshing={refreshing}
      onRefresh={() => void refresh()}
      emptyText={() => '這個分類沒有紀錄'}
      renderAction={({ tx, voided }) =>
        isVoidable(tx.kind) && !voided ? (
          <button className="void-btn" onClick={() => openSheet(<VoidSheet tx={tx} />)}>
            沖銷
          </button>
        ) : null
      }
      footer={
        <div className="export-box glass">
          <div>
            <b>匯出備份</b>
            <small>下載全部明細（CSV），可用 Excel 開啟</small>
          </div>
          <button className="btn btn-ghost sm" onClick={exportCsv}>
            <Icon name="download" /> 匯出
          </button>
        </div>
      }
    />
  )
}
