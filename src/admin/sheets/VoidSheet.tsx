import { useState } from 'react'
import { isApiError } from '../../shared/api'
import { fmt, fullDateTime, signed } from '../../shared/domain/format'
import { checkVoid } from '../../shared/domain/rules'
import type { Tx } from '../../shared/domain/types'
import { useSheetAction } from '../../shared/hooks/useSheetAction'
import FormError from '../../shared/ui/FormError'
import Icon from '../../shared/ui/Icon'
import Success from '../../shared/ui/Success'
import { useUI } from '../../shared/ui/UIProvider'
import { useAdminData } from '../data'

const NOT_ENOUGH = '目前餘額不夠扣回這筆儲值，無法沖銷'

/** 沖銷：不刪除紀錄，而是新增一筆反向紀錄（原紀錄標示「已沖銷」） */
export default function VoidSheet({ tx }: { tx: Tx }) {
  const { derived, actions, offline, refresh } = useAdminData()
  const { closeSheet } = useUI()
  const submit = useSheetAction()
  const [reason, setReason] = useState('')
  const [newBalance, setNewBalance] = useState(0) // 成功當下的餘額快照

  const balance = derived.stats.balance
  const afterVoid = balance - tx.amount // 沖銷消費 = 退款（餘額增加）；沖銷儲值 = 扣回（餘額減少）
  const notEnough = checkVoid(tx, balance) === 'INSUFFICIENT'
  const ready = reason.trim() !== '' && !notEnough && !offline

  const confirm = async () => {
    if (!ready) return
    const ok = await submit.run(() => actions.voidTx({ txId: tx.id, reason: reason.trim() }), {
      messages: { INSUFFICIENT: NOT_ENOUGH, ALREADY_VOIDED: '這筆已經被沖銷過了' },
      fallback: '沖銷失敗，請稍後再試',
      onError: (e) => isApiError(e) && e.code === 'ALREADY_VOIDED' && void refresh(),
    })
    if (ok) setNewBalance(afterVoid)
  }

  if (submit.done)
    return (
      <Success
        title="已沖銷"
        actions={
          <button className="btn btn-primary btn-block" onClick={closeSheet}>
            完成
          </button>
        }
      >
        「{tx.title}」已沖銷
        <br />
        餘額變為 NT$ {fmt(newBalance)}
      </Success>
    )

  return (
    <>
      <span className="sheet-icon danger">
        <Icon name="undo" />
      </span>
      <h3>沖銷這筆紀錄？</h3>
      <p>紀錄不會被刪除，而是新增一筆反向紀錄，原紀錄會標示「已沖銷」。</p>
      <div className="sheet-summary">
        <div>
          <span>項目</span>
          <b>{tx.title}</b>
        </div>
        <div>
          <span>時間</span>
          <b>{fullDateTime(tx.createdAt)}</b>
        </div>
        <div>
          <span>原金額</span>
          <b>{signed(tx.amount)}</b>
        </div>
        <div>
          <span>沖銷後餘額</span>
          <b className={notEnough ? 'neg' : ''}>NT$ {fmt(afterVoid)}</b>
        </div>
      </div>
      <label className="text-field">
        <span>沖銷原因（必填）</span>
        <input
          type="text"
          autoComplete="off"
          maxLength={40}
          placeholder="例如：金額輸入錯誤"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      <FormError text={submit.error || (notEnough ? NOT_ENOUGH : offline ? '目前離線，暫時無法操作' : '')} />
      <div className="sheet-actions">
        <button className="btn btn-ghost" onClick={closeSheet}>
          取消
        </button>
        <button className="btn btn-danger" disabled={!ready || submit.busy} onClick={() => void confirm()}>
          {submit.busy ? '處理中…' : '確認沖銷'}
        </button>
      </div>
    </>
  )
}
