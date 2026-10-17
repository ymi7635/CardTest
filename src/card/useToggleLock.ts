import { useUI } from '../shared/ui/UIProvider'
import { useCardData } from './data'

/** 鎖卡／解鎖（首頁右上角與卡片頁共用）：離線時不動作，失敗時提示 */
export function useToggleLock() {
  const { state, offline, actions } = useCardData()
  const { toast } = useUI()
  return async () => {
    if (offline) return toast('目前離線，暫時無法操作')
    try {
      await actions.setLock(!state.locked)
      toast(state.locked ? '卡片已解鎖' : '卡片已鎖定')
    } catch {
      toast('操作失敗，請稍後再試')
    }
  }
}
