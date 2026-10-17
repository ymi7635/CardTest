import type { TxRow } from '../../shared/domain/types'
import LedgerPage from '../../shared/ui/LedgerPage'
import { useCardData } from '../data'

type Filter = 'all' | 'spend' | 'credit' | 'gift'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'spend', label: '支出' },
  { key: 'credit', label: '儲值' },
  { key: 'gift', label: '禮物' },
]

/** 沖銷紀錄不顯示給她看；被沖銷的原紀錄會標示「已沖銷」 */
function matches({ tx }: TxRow, filter: Filter): boolean {
  if (tx.kind === 'void') return false
  if (filter === 'spend') return tx.kind === 'spend'
  if (filter === 'credit') return tx.kind === 'initial' || tx.kind === 'topup' || tx.kind === 'anniv'
  if (filter === 'gift') return tx.kind === 'gift'
  return true
}

export default function History() {
  const { derived, at, refresh, refreshing } = useCardData()
  return (
    <LedgerPage
      eyebrow="STATEMENT"
      title="明細"
      filters={FILTERS}
      matches={matches}
      rows={derived.rows}
      now={at}
      refreshing={refreshing}
      onRefresh={() => void refresh()}
      emptyText={(filter) => (filter === 'all' ? '還沒有消費紀錄' : '這個分類沒有紀錄')}
    />
  )
}
