import Background from '../shared/ui/Background'
import Icon from '../shared/ui/Icon'
import { FailedScreen, InvalidLinkScreen, LoadingScreen } from '../shared/ui/screens'
import { UIProvider } from '../shared/ui/UIProvider'
import { AdminDataProvider, useAdminRemote } from './data'
import Shell from './Shell'

function Stage() {
  const { ledger } = useAdminRemote()
  if (ledger.status === 'invalid') return <InvalidLinkScreen message="後台連結不正確或已經失效，請向系統建置者重新索取。" />
  if (ledger.status === 'failed') return <FailedScreen onRetry={() => void ledger.refresh()} />
  if (!ledger.data || ledger.status === 'loading') return <LoadingScreen />

  if (!ledger.data.activated)
    return (
      <main className="screen">
        <div className="screen-in">
          <span className="screen-ic">
            <Icon name="card" />
          </span>
          <h1>她還沒有開卡</h1>
          <p>等她完成開卡問答後，這裡就會出現餘額與明細，也就能開始儲值了。</p>
          <button className="btn btn-ghost" onClick={() => void ledger.refresh()}>
            <Icon name="refresh" /> 重新整理
          </button>
        </div>
      </main>
    )

  return <Shell />
}

export default function App() {
  return (
    <AdminDataProvider>
      <UIProvider>
        <Background stars={false} />
        <Stage />
      </UIProvider>
    </AdminDataProvider>
  )
}
