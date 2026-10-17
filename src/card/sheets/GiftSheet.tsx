import { isApiError } from '../../shared/api'
import type { Gift } from '../../shared/domain/config'
import { useSheetAction } from '../../shared/hooks/useSheetAction'
import Confetti from '../../shared/ui/Confetti'
import FormError from '../../shared/ui/FormError'
import Icon from '../../shared/ui/Icon'
import Success from '../../shared/ui/Success'
import { useUI } from '../../shared/ui/UIProvider'
import { useCardData } from '../data'
import LockedNotice from './LockedNotice'

/** 兌換禮物：確認 → 成功（小煙火）。不扣額度、每項限兌換一次。 */
export default function GiftSheet({ gift }: { gift: Gift }) {
  const { state, actions, offline, refresh } = useCardData()
  const { closeSheet } = useUI()
  const submit = useSheetAction()

  const claim = () =>
    submit.run(() => actions.claimGift(gift.key), {
      messages: { ALREADY_CLAIMED: '這份禮物已經兌換過囉', NETWORK: '網路不穩，請稍後再按一次' },
      fallback: '兌換失敗，請稍後再試',
      onError: (e) => isApiError(e) && (e.code === 'ALREADY_CLAIMED' || e.code === 'LOCKED') && void refresh(),
    })

  if (submit.done)
    return (
      <>
        <Confetti />
        <Success
          title="兌換成功 ♡"
          actions={
            <button className="btn btn-primary btn-block" onClick={closeSheet}>
              完成
            </button>
          }
        >
          「{gift.title}」已經記下來了
          <br />
          記得找我領取喔
        </Success>
      </>
    )

  if (state.locked) return <LockedNotice action="兌換禮物" />

  return (
    <>
      <span className="sheet-icon">
        <Icon name={gift.icon} />
      </span>
      <h3>{gift.title}</h3>
      <p>{gift.desc}</p>
      <div className="sheet-summary">
        <div>
          <span>費用</span>
          <b>不扣除額度</b>
        </div>
        <div>
          <span>兌換次數</span>
          <b>限兌換一次</b>
        </div>
      </div>
      <FormError text={submit.error || (offline ? '目前離線，暫時無法兌換' : '')} />
      <div className="sheet-actions">
        <button className="btn btn-ghost" onClick={closeSheet}>
          取消
        </button>
        <button className="btn btn-primary" disabled={submit.busy || offline} onClick={() => void claim()}>
          {submit.busy ? '處理中…' : '確認兌換'}
        </button>
      </div>
    </>
  )
}
