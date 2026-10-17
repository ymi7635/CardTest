import { useRef, useState } from 'react'
import { fmt } from '../../shared/domain/format'
import { uid } from '../../shared/domain/id'
import { useSheetAction } from '../../shared/hooks/useSheetAction'
import FormError from '../../shared/ui/FormError'
import Icon from '../../shared/ui/Icon'
import Success from '../../shared/ui/Success'
import { useUI } from '../../shared/ui/UIProvider'
import { useAdminData } from '../data'

interface Props {
  amount: number
  note: string
  /** 儲值成功後（用來清空表單） */
  onDone: () => void
}

/** 儲值確認：顯示儲值前後的餘額，按下確認才真的寫入 */
export default function TopupConfirmSheet({ amount, note, onDone }: Props) {
  const { derived, actions, name, offline } = useAdminData()
  const { closeSheet } = useUI()
  const submit = useSheetAction()
  const requestId = useRef(uid()) // 網路重送時帶同一個 id，後端不會重複儲值
  const before = derived.stats.balance
  const [newBalance, setNewBalance] = useState(0) // 成功當下的餘額快照（成功後 derived 已經更新，不能再加一次）

  const confirm = async () => {
    if (offline) return
    const ok = await submit.run(() => actions.topup({ amount, note, requestId: requestId.current }), {
      messages: { NETWORK: '網路不穩，請再按一次（不會重複儲值）' },
      fallback: '儲值失敗，請稍後再試',
    })
    if (!ok) return
    setNewBalance(before + amount)
    onDone()
  }

  if (submit.done)
    return (
      <Success
        title="儲值完成"
        actions={
          <button className="btn btn-primary btn-block" onClick={closeSheet}>
            完成
          </button>
        }
      >
        已為{name ? ` ${name} ` : ''}增加 NT$ {fmt(amount)}
        <br />
        目前餘額 NT$ {fmt(newBalance)}
      </Success>
    )

  return (
    <>
      <span className="sheet-icon">
        <Icon name="wallet" />
      </span>
      <h3>確認儲值</h3>
      <p>送出後她那邊會立刻看到新的餘額</p>
      <div className="sheet-summary">
        <div>
          <span>儲值金額</span>
          <b>+ NT$ {fmt(amount)}</b>
        </div>
        <div>
          <span>備註</span>
          <b>{note}</b>
        </div>
        <div>
          <span>儲值前餘額</span>
          <b>NT$ {fmt(before)}</b>
        </div>
        <div>
          <span>儲值後餘額</span>
          <b className="pos">NT$ {fmt(before + amount)}</b>
        </div>
      </div>
      <FormError text={submit.error || (offline ? '目前離線，暫時無法儲值' : '')} />
      <div className="sheet-actions">
        <button className="btn btn-ghost" onClick={closeSheet}>
          取消
        </button>
        <button className="btn btn-primary" disabled={submit.busy || offline} onClick={() => void confirm()}>
          {submit.busy ? '處理中…' : '確認儲值'}
        </button>
      </div>
    </>
  )
}
