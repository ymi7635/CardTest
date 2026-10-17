import { useState } from 'react'
import { TOPUP_MAX } from '../../shared/domain/config'
import { fmt } from '../../shared/domain/format'
import { checkTopup } from '../../shared/domain/rules'
import AmountField from '../../shared/ui/AmountField'
import Icon from '../../shared/ui/Icon'
import FormError from '../../shared/ui/FormError'
import Page from '../../shared/ui/Page'
import { useUI } from '../../shared/ui/UIProvider'
import { useAdminData } from '../data'
import TopupConfirmSheet from '../sheets/TopupConfirmSheet'

const PRESETS = [500, 1000, 2000]
const NOTES = ['生日', '節日', '獎勵', '補貼']

export default function Topup() {
  const { derived, name, offline } = useAdminData()
  const { openSheet } = useUI()
  const [amount, setAmount] = useState(0)
  const [note, setNote] = useState('')

  const rule = amount > 0 || note.trim() ? checkTopup({ amount, note }) : null
  const tooMuch = amount > TOPUP_MAX
  const ready = amount > 0 && !rule && !offline
  const balance = derived.stats.balance

  const reset = () => {
    setAmount(0)
    setNote('')
  }

  return (
    <Page>
      <div className="page-head">
        <span className="eyebrow">TOP UP</span>
        <h2>儲值</h2>
        <p>
          替{name ? ` ${name} ` : '她'}增加額度，目前餘額 <b>NT$ {fmt(balance)}</b>
        </p>
      </div>

      <div className="glass topup-form">
        <AmountField value={amount} onChange={setAmount} maxDigits={6} label="儲值金額" />

        <div className="quick-chips center" aria-label="快捷金額">
          {PRESETS.map((p) => (
            <button key={p} type="button" className={amount === p ? 'on' : ''} onClick={() => setAmount(p)}>
              +{fmt(p)}
            </button>
          ))}
        </div>

        <label className="text-field">
          <span>備註（必填）</span>
          <input
            type="text"
            autoComplete="off"
            enterKeyHint="done"
            maxLength={40}
            placeholder="例如：生日禮金"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          />
        </label>
        <div className="quick-chips" aria-label="常用備註">
          {NOTES.map((n) => (
            <button key={n} type="button" className={note === n ? 'on' : ''} onClick={() => setNote(n)}>
              {n}
            </button>
          ))}
        </div>

        <div className="sheet-summary">
          <div>
            <span>儲值後餘額</span>
            <b className={amount > 0 ? 'pos' : ''}>NT$ {fmt(balance + (amount > 0 && !tooMuch ? amount : 0))}</b>
          </div>
        </div>

        <FormError text={tooMuch ? `單筆最多 NT$ ${fmt(TOPUP_MAX)}` : offline ? '目前離線，暫時無法儲值' : ''} />

        <button
          className="btn btn-primary btn-block"
          disabled={!ready}
          onClick={() => openSheet(<TopupConfirmSheet amount={amount} note={note.trim()} onDone={reset} />)}
        >
          <Icon name="wallet" /> 下一步：確認儲值
        </button>
      </div>
    </Page>
  )
}
