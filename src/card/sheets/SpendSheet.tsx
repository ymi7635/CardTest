import { useMemo, useRef, useState } from 'react'
import { isApiError } from '../../shared/api'
import { AMOUNT_MAX, TITLE_MAX } from '../../shared/domain/config'
import { fmt } from '../../shared/domain/format'
import { uid } from '../../shared/domain/id'
import { checkSpend, type RuleError } from '../../shared/domain/rules'
import type { TxRow } from '../../shared/domain/types'
import { useSheetAction } from '../../shared/hooks/useSheetAction'
import AmountField from '../../shared/ui/AmountField'
import FormError from '../../shared/ui/FormError'
import Icon from '../../shared/ui/Icon'
import Success from '../../shared/ui/Success'
import { useUI } from '../../shared/ui/UIProvider'
import { useCardData } from '../data'
import LockedNotice from './LockedNotice'

const RULE_MESSAGES: Record<RuleError, string> = {
  INSUFFICIENT: '額度不足',
  LOCKED: '卡片已鎖定，請先解鎖',
  INVALID_INPUT: '請輸入金額與消費項目',
}

const MAX_RECENT_TITLES = 6

/** 最近用過的消費項目（去重、不含已沖銷），讓她一鍵帶入 */
function recentTitles(rows: TxRow[]): string[] {
  const titles = new Set<string>()
  for (const { tx, voided } of rows) {
    if (tx.kind === 'spend' && !voided) titles.add(tx.title)
    if (titles.size === MAX_RECENT_TITLES) break
  }
  return [...titles]
}

/** 新增消費：輸入金額與項目 → 即時顯示消費後餘額 → 確認 */
export default function SpendSheet() {
  const { state, derived, actions, offline, refresh } = useCardData()
  const { closeSheet } = useUI()
  const submit = useSheetAction()
  const requestId = useRef(uid()) // 這張面板代表「一次消費」；網路重送時帶同一個 id，後端不會扣兩次
  const [amount, setAmount] = useState(0)
  const [title, setTitle] = useState('')
  const [paid, setPaid] = useState({ amount: 0, balance: 0 })

  const balance = derived.stats.balance
  const after = balance - amount
  const chips = useMemo(() => recentTitles(derived.rows), [derived.rows])
  const rule = amount > 0 || title.trim() ? checkSpend({ title, amount }, balance, state.locked) : null
  const ready = amount > 0 && title.trim() !== '' && !rule && !offline

  const confirm = async () => {
    if (!ready) return
    const ok = await submit.run(() => actions.spend({ title: title.trim(), amount, requestId: requestId.current }), {
      messages: { INSUFFICIENT: '餘額已經變動，額度不足了', NETWORK: '網路不穩，請稍後再按一次（不會重複扣款）' },
      fallback: '消費失敗，請稍後再試',
      onError: (e) => isApiError(e) && (e.code === 'INSUFFICIENT' || e.code === 'LOCKED') && void refresh(),
    })
    if (ok) setPaid({ amount, balance: after })
  }

  if (submit.done)
    return (
      <Success
        title="消費成功"
        actions={
          <button className="btn btn-primary btn-block" onClick={closeSheet}>
            完成
          </button>
        }
      >
        已記錄「{title.trim()}」NT$ {fmt(paid.amount)}
        <br />
        目前餘額 NT$ {fmt(paid.balance)}
      </Success>
    )

  if (state.locked) return <LockedNotice action="消費" />

  const hint = submit.error || (offline ? '目前離線，暫時無法消費' : rule && amount > 0 ? RULE_MESSAGES[rule] : '')

  return (
    <>
      <span className="sheet-icon">
        <Icon name="bag" />
      </span>
      <h3>新增消費</h3>

      <AmountField value={amount} onChange={setAmount} maxDigits={String(AMOUNT_MAX).length} label="消費金額" />

      <label className="text-field">
        <span>消費項目</span>
        <input
          type="text"
          autoComplete="off"
          enterKeyHint="done"
          placeholder="例如：手搖飲"
          maxLength={TITLE_MAX}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        />
      </label>

      {chips.length > 0 && (
        <div className="quick-chips" aria-label="最近用過的項目">
          {chips.map((c) => (
            <button key={c} type="button" className={title === c ? 'on' : ''} onClick={() => setTitle(c)}>
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="sheet-summary">
        <div>
          <span>目前餘額</span>
          <b>NT$ {fmt(balance)}</b>
        </div>
        <div>
          <span>消費後餘額</span>
          <b className={after < 0 ? 'neg' : ''}>NT$ {fmt(amount > 0 ? after : balance)}</b>
        </div>
      </div>

      <FormError text={hint} />

      <div className="sheet-actions">
        <button className="btn btn-ghost" onClick={closeSheet}>
          取消
        </button>
        <button className="btn btn-primary" disabled={!ready || submit.busy} onClick={() => void confirm()}>
          {submit.busy ? '處理中…' : '確認消費'}
        </button>
      </div>
    </>
  )
}
