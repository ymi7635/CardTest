import { fmt } from '../domain/format'

interface Props {
  /** 0 代表尚未輸入 */
  value: number
  onChange: (n: number) => void
  maxDigits: number
  label: string
}

/** 大字金額輸入：「NT$」緊貼數字，輸入框寬度隨位數自動伸縮；跳數字鍵盤，自動加千分位 */
export default function AmountField({ value, onChange, maxDigits, label }: Props) {
  const text = value > 0 ? fmt(value) : ''
  const digits = String(value || '').length
  const commas = text.split(',').length - 1
  // 用 ch 估寬度（數字等寬、逗號較窄），沒輸入時留給 placeholder「0」
  const width = value > 0 ? digits + commas * 0.45 + 0.4 : 1.4

  return (
    <label className="amount-field">
      <span>NT$</span>
      <input
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        placeholder="0"
        aria-label={label}
        style={{ width: `${width}ch` }}
        value={text}
        onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, '').slice(0, maxDigits)) || 0)}
      />
    </label>
  )
}
