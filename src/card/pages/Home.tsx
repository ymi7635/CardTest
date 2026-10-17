import { useState } from 'react'
import { ANNIVERSARY } from '../../shared/domain/config'
import { dotDate, fmt } from '../../shared/domain/format'
import { daysTogether, nextAnniversary } from '../../shared/domain/rules'
import { useLocalFlag } from '../../shared/hooks/useLocalFlag'
import Card from '../../shared/ui/Card'
import Icon from '../../shared/ui/Icon'
import CountText from '../../shared/ui/CountText'
import Empty from '../../shared/ui/Empty'
import Marquee from '../../shared/ui/Marquee'
import Page from '../../shared/ui/Page'
import SectionHead from '../../shared/ui/SectionHead'
import TxItem from '../../shared/ui/TxItem'
import { useUI } from '../../shared/ui/UIProvider'
import { useCardData } from '../data'
import SpendSheet from '../sheets/SpendSheet'
import type { CardTab } from '../Shell'

export default function Home({ go }: { go: (tab: CardTab) => void }) {
  const { state, derived, name, at } = useCardData()
  const { openSheet } = useUI()
  const [hide, toggleHide] = useLocalFlag('anniv-hide-balance')
  const [open, setOpen] = useState(false)

  const { stats } = derived
  const days = daysTogether(at)
  const next = nextAnniversary(at)
  const ratio = stats.credit > 0 ? Math.max(0, Math.min(1, stats.balance / stats.credit)) : 0
  const recent = derived.rows.filter((r) => r.tx.kind !== 'void').slice(0, 5)

  return (
    <Page className="home">
      <div className="card-stage">
        <Card name={name} locked={state.locked} />
        <p className="flip-hint">
          <Icon name="flip" /> 輕觸卡片翻面
        </p>
      </div>

      <Marquee
        items={['HAPPY 4TH ANNIVERSARY', dotDate(ANNIVERSARY), `${fmt(days)} DAYS OF US`, 'FOREVER TO GO', `FOR ${name.toUpperCase()}`]}
      />

      <div className="bento stagger">
        <div className="tile tile-balance span-2">
          <div className="tile-head">
            <span className="eyebrow">AVAILABLE CREDIT</span>
            <button className="icon-btn sm" onClick={toggleHide} aria-label={hide ? '顯示餘額' : '隱藏餘額'}>
              <Icon name={hide ? 'eyeOff' : 'eye'} />
            </button>
          </div>
          <div className="balance">
            <small>NT$</small>
            <CountText value={stats.balance} hidden={hide} />
          </div>
          <div className="meter">
            <i style={{ transform: `scaleX(${ratio})` }} />
          </div>
          <div className="balance-foot">
            <span>
              本月支出 <b>NT$ {hide ? '••••' : fmt(stats.monthSpent)}</b>
            </span>
            <button className={`more ${open ? 'on' : ''}`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              額度明細 <Icon name="chevron" />
            </button>
          </div>
          <div className={`details ${open ? 'on' : ''}`}>
            <div>
              <div>
                總額度<b>NT$ {hide ? '••••' : fmt(stats.credit)}</b>
              </div>
              <div>
                累計支出<b>NT$ {hide ? '••••' : fmt(stats.spent)}</b>
              </div>
              <div>
                累計儲值<b>NT$ {hide ? '••••' : fmt(stats.topups)}</b>
              </div>
              <div>
                消費筆數<b>{stats.spendCount} 筆</b>
              </div>
            </div>
          </div>
        </div>

        <button className="cta span-2" onClick={() => openSheet(<SpendSheet />)}>
          <span className="cta-ic">
            <Icon name="plus" />
          </span>
          <span className="cta-txt">
            <b>新增消費</b>
            <small>記一筆，額度自動扣除</small>
          </span>
          <Icon name="right" className="arrow" />
        </button>

        <div className="tile tile-stat">
          <span className="eyebrow">TOGETHER</span>
          <div className="stat">
            <CountText value={days} />
          </div>
          <span className="stat-sub">天，而且還在增加</span>
        </div>

        <div className="tile tile-stat accent">
          <span className="eyebrow">{next.days === 0 ? 'TODAY' : `${next.years}TH ANNIV.`}</span>
          <div className="stat">{next.days === 0 ? '♡' : <CountText value={next.days} />}</div>
          <span className="stat-sub">{next.days === 0 ? `${next.years} 週年快樂！` : `天後是 ${next.years} 週年`}</span>
        </div>
      </div>

      <SectionHead
        title="最近消費"
        action={
          recent.length > 0 && (
            <button className="link" onClick={() => go('history')}>
              查看全部
            </button>
          )
        }
      />
      <div className="tx-list stagger">
        {recent.length ? recent.map((r) => <TxItem key={r.tx.id} row={r} now={at} showBalance={false} />) : <Empty text="還沒有消費紀錄" />}
      </div>
    </Page>
  )
}
