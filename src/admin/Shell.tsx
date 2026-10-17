import { useState } from 'react'
import Nav, { type NavTab } from '../shared/ui/Nav'
import { OfflineBar } from '../shared/ui/screens'
import { useAdminData } from './data'
import History from './pages/History'
import Overview from './pages/Overview'
import Topup from './pages/Topup'

export type AdminTab = 'overview' | 'topup' | 'history'

const TABS: NavTab<AdminTab>[] = [
  { key: 'overview', icon: 'home', label: '總覽' },
  { key: 'topup', icon: 'wallet', label: '儲值' },
  { key: 'history', icon: 'receipt', label: '明細' },
]

export default function Shell() {
  const { name, offline } = useAdminData()
  const [tab, setTab] = useState<AdminTab>('overview')

  const go = (k: AdminTab) => {
    setTab(k)
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="app">
      {offline && <OfflineBar />}
      <header className="top">
        <div>
          <div className="eyebrow">ADMIN · FOR {name.toUpperCase()}</div>
          <div className="hi">
            卡片<span className="grad-text">後台</span>
          </div>
        </div>
      </header>

      {tab === 'overview' && <Overview key="overview" go={go} />}
      {tab === 'topup' && <Topup key="topup" />}
      {tab === 'history' && <History key="history" />}

      <Nav tabs={TABS} active={tab} onChange={go} />
    </div>
  )
}
