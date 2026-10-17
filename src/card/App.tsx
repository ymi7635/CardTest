import { useEffect, useState } from 'react'
import type { Profile } from '../shared/domain/types'
import Background from '../shared/ui/Background'
import { FailedScreen, InvalidLinkScreen, LoadingScreen } from '../shared/ui/screens'
import { UIProvider } from '../shared/ui/UIProvider'
import { CardDataProvider, useCardRemote } from './data'
import Ceremony from './Ceremony'
import Quiz from './quiz/Quiz'
import Shell from './Shell'

/**
 * 畫面流程：
 *   載入中／連結無效／連線失敗 → 尚未開卡：問答 → 開卡儀式 → 主畫面（首頁、明細、卡片）
 * 已經開過卡的人（包含換手機、清掉瀏覽器資料後重開連結）會直接進主畫面。
 */
function Stage() {
  const { ledger, actions } = useCardRemote()
  const [ceremony, setCeremony] = useState(false)
  const stage = ledger.status === 'ready' && ledger.data ? (!ledger.data.activated ? 'quiz' : ceremony ? 'ceremony' : 'app') : ledger.status

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [stage])

  if (ledger.status === 'invalid') return <InvalidLinkScreen />
  if (ledger.status === 'failed') return <FailedScreen onRetry={() => void ledger.refresh()} />
  if (!ledger.data || ledger.status === 'loading') return <LoadingScreen />

  if (!ledger.data.activated) {
    const onSubmit = async (profile: Profile) => {
      setCeremony(true) // 開卡成功的那一刻就接著播放儀式
      try {
        await actions.activate(profile)
      } catch (e) {
        setCeremony(false)
        throw e
      }
    }
    return <Quiz onSubmit={onSubmit} />
  }

  if (ceremony) return <Ceremony name={ledger.data.profile?.name ?? ''} onDone={() => setCeremony(false)} />
  return <Shell onReplay={() => setCeremony(true)} />
}

export default function App() {
  return (
    <CardDataProvider>
      <UIProvider>
        <Background />
        <Stage />
      </UIProvider>
    </CardDataProvider>
  )
}
