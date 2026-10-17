import { useState } from 'react'
import { GIFTS } from '../shared/domain/config'
import { greeting } from '../shared/domain/format'
import { claimedGifts } from '../shared/domain/rules'
import Icon from '../shared/ui/Icon'
import Nav, { type NavTab } from '../shared/ui/Nav'
import { OfflineBar } from '../shared/ui/screens'
import { useCardData } from './data'
import Gifts from './pages/Gifts'
import History from './pages/History'
import Home from './pages/Home'
import Profile from './pages/Profile'
import { useToggleLock } from './useToggleLock'

export type CardTab = 'home' | 'history' | 'gifts' | 'profile'

export default function Shell({ onReplay }: { onReplay: () => void }) {
  const { state, name, at, offline } = useCardData()
  const [tab, setTab] = useState<CardTab>('home')
  const toggleLock = useToggleLock()

  // 禮物分頁的小圓點：還沒兌換的禮物數量
  const unclaimed = GIFTS.length - claimedGifts(state.transactions).size
  const tabs: NavTab<CardTab>[] = [
    { key: 'home', icon: 'home', label: '首頁' },
    { key: 'history', icon: 'receipt', label: '明細' },
    { key: 'gifts', icon: 'gift', label: '禮物', badge: unclaimed },
    { key: 'profile', icon: 'card', label: '卡片' },
  ]

  const go = (k: CardTab) => {
    setTab(k)
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="app">
      {offline && <OfflineBar />}
      <header className="top">
        <div>
          <div className="eyebrow">{greeting(at)}</div>
          <div className="hi">
            Hi, <span className="grad-text">{name}</span>
          </div>
        </div>
        <div className="top-actions">
          <button
            className={`icon-btn ${state.locked ? 'is-on' : ''}`}
            aria-label={state.locked ? '解鎖卡片' : '鎖定卡片'}
            onClick={() => void toggleLock()}
          >
            <Icon name={state.locked ? 'lock' : 'unlock'} />
          </button>
        </div>
      </header>

      {tab === 'home' && <Home key="home" go={go} />}
      {tab === 'history' && <History key="history" />}
      {tab === 'gifts' && <Gifts key="gifts" />}
      {tab === 'profile' && <Profile key="profile" onReplay={onReplay} />}

      <Nav tabs={tabs} active={tab} onChange={go} />
    </div>
  )
}
