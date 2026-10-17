import { GIFTS } from '../../shared/domain/config'
import { fmt, fullDateTime } from '../../shared/domain/format'
import { giftClaimTimes } from '../../shared/domain/rules'
import Icon from '../../shared/ui/Icon'
import CountText from '../../shared/ui/CountText'
import Empty from '../../shared/ui/Empty'
import Page from '../../shared/ui/Page'
import SectionHead from '../../shared/ui/SectionHead'
import TxItem from '../../shared/ui/TxItem'
import { useUI } from '../../shared/ui/UIProvider'
import { useAdminData } from '../data'
import type { AdminTab } from '../Shell'

export default function Overview({ go }: { go: (tab: AdminTab) => void }) {
  const { state, derived, at, offline, actions } = useAdminData()
  const { toast } = useUI()
  const { stats } = derived
  const recent = derived.rows.slice(0, 5)
  const claimedAt = giftClaimTimes(state.transactions)

  const unlock = async () => {
    if (offline) return toast('目前離線，暫時無法操作')
    try {
      await actions.unlock()
      toast('已替她解鎖卡片')
    } catch {
      toast('操作失敗，請稍後再試')
    }
  }

  return (
    <Page>
      <div className="page-head">
        <span className="eyebrow">OVERVIEW</span>
        <h2>總覽</h2>
      </div>

      <div className="tile adm-hero">
        <span className="eyebrow">CURRENT BALANCE</span>
        <div className="balance">
          <small>NT$</small>
          <CountText value={stats.balance} />
        </div>
        <div className="adm-status">
          <span className={`status-pill ${state.locked ? 'is-locked' : ''}`}>
            <Icon name={state.locked ? 'lock' : 'shield'} />
            {state.locked ? '卡片鎖定中' : '卡片正常'}
          </span>
          {state.locked && (
            <button className="btn btn-ghost sm" onClick={() => void unlock()}>
              <Icon name="unlock" /> 替她解鎖
            </button>
          )}
        </div>
      </div>

      <div className="bento stagger">
        <div className="tile tile-stat">
          <span className="eyebrow">本月支出</span>
          <div className="stat">{fmt(stats.monthSpent)}</div>
          <span className="stat-sub">NT$</span>
        </div>
        <div className="tile tile-stat">
          <span className="eyebrow">累計支出</span>
          <div className="stat">{fmt(stats.spent)}</div>
          <span className="stat-sub">共 {stats.spendCount} 筆</span>
        </div>
        <div className="tile tile-stat">
          <span className="eyebrow">累計儲值</span>
          <div className="stat">{fmt(stats.topups)}</div>
          <span className="stat-sub">含紀念日加值</span>
        </div>
        <div className="tile tile-stat accent">
          <span className="eyebrow">總額度</span>
          <div className="stat">{fmt(stats.credit)}</div>
          <span className="stat-sub">含初始額度</span>
        </div>

        <button className="cta span-2" onClick={() => go('topup')}>
          <span className="cta-ic">
            <Icon name="wallet" />
          </span>
          <span className="cta-txt">
            <b>儲值</b>
            <small>替她增加額度</small>
          </span>
          <Icon name="right" className="arrow" />
        </button>
      </div>

      <div className="gift-status glass">
        <div className="gs-head">
          <Icon name="gift" />
          <b>禮物兌換</b>
          <span>
            {claimedAt.size} / {GIFTS.length}
          </span>
        </div>
        {GIFTS.map((g) => {
          const at = claimedAt.get(g.key)
          return (
            <div className={`gs-row ${at ? 'on' : ''}`} key={g.key}>
              <Icon name={at ? 'check' : g.icon} />
              <span>{g.title}</span>
              <em>{at ? fullDateTime(at) : '尚未兌換'}</em>
            </div>
          )
        })}
      </div>

      <SectionHead
        title="最近明細"
        action={
          recent.length > 0 && (
            <button className="link" onClick={() => go('history')}>
              查看全部
            </button>
          )
        }
      />
      <div className="tx-list stagger">
        {recent.length ? recent.map((r) => <TxItem key={r.tx.id} row={r} now={at} />) : <Empty text="還沒有任何紀錄" />}
      </div>
    </Page>
  )
}
