import { useSheetAction } from '../../shared/hooks/useSheetAction'
import FormError from '../../shared/ui/FormError'
import Icon from '../../shared/ui/Icon'
import { useUI } from '../../shared/ui/UIProvider'
import { useCardData } from '../data'

/** 卡片鎖定時，消費與兌換面板顯示這個畫面，並提供直接解鎖 */
export default function LockedNotice({ action }: { action: string }) {
  const { actions, offline } = useCardData()
  const { closeSheet } = useUI()
  const unlock = useSheetAction()

  return (
    <>
      <span className="sheet-icon">
        <Icon name="lock" />
      </span>
      <h3>卡片已鎖定</h3>
      <p>請先解鎖卡片再{action}</p>
      <div className="sheet-actions">
        <button className="btn btn-ghost" onClick={closeSheet}>
          先不要
        </button>
        <button
          className="btn btn-primary"
          disabled={offline || unlock.busy}
          onClick={() => void unlock.run(() => actions.setLock(false), { fallback: '解鎖失敗，請稍後再試' })}
        >
          解鎖卡片
        </button>
      </div>
      <FormError text={unlock.error} />
    </>
  )
}
