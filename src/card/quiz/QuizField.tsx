import type { KeyboardEvent } from 'react'
import type { Question } from '../../shared/domain/config'
import Icon from '../../shared/ui/Icon'

interface Props {
  question: Question
  /** 從 0 開始的題號 */
  index: number
  value: string
  locked: boolean
  passed: boolean
  active: boolean
  wrong: boolean
  /** 已經答錯幾次 */
  tries: number
  /** 送出中，整份問答都不能再改 */
  frozen: boolean
  sectionRef: (el: HTMLElement | null) => void
  inputRef: (el: HTMLInputElement | null) => void
  onChange: (value: string) => void
  /** 確認答案（離開欄位） */
  onCommit: (value: string) => void
  /** 按下 Enter */
  onEnter: (value: string) => void
}

/** 開卡問答裡的一題（純畫面，狀態由 useQuizState 管理） */
export default function QuizField({
  question: q,
  index,
  value,
  locked,
  passed,
  active,
  wrong,
  tries,
  frozen,
  sectionRef,
  inputRef,
  onChange,
  onCommit,
  onEnter,
}: Props) {
  const className = ['qf', 'glass', locked && 'is-locked', passed && 'is-ok', wrong && 'is-err', active && 'is-active']
    .filter(Boolean)
    .join(' ')

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    onEnter(e.currentTarget.value)
  }

  return (
    <section className={className} ref={sectionRef}>
      <div className="qf-top">
        <span className="qf-no">{String(index + 1).padStart(2, '0')}</span>
        <div className="qf-labels">
          <span className="qf-en">{q.en}</span>
          <label htmlFor={`q-${q.key}`}>{q.label}</label>
        </div>
        <span className="qf-state">{locked ? <Icon name="lock" /> : passed ? <Icon name="check" /> : null}</span>
      </div>

      {/* iOS 的日期欄位沒有 placeholder，空白時用外層補一個提示文字 */}
      <div className={`q-input ${q.type === 'date' && !value ? 'is-empty' : ''}`} data-ph="點這裡選擇日期">
        <input
          id={`q-${q.key}`}
          ref={inputRef}
          type={q.type}
          value={value}
          disabled={locked || frozen}
          placeholder={q.placeholder}
          maxLength={q.maxLength}
          min={q.type === 'date' ? '1990-01-01' : undefined}
          max={q.type === 'date' ? '2030-12-31' : undefined}
          autoComplete="off"
          enterKeyHint="next"
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => onCommit(e.target.value)}
          onKeyDown={onKeyDown}
        />
      </div>

      <div className="qf-msg" aria-live="polite">
        {locked ? (
          '完成上一題後解鎖'
        ) : wrong ? (
          <>
            <span className="qf-err">{q.wrong || '答案不太對喔'}</span>
            {tries >= 2 && q.hint && <span className="qf-hint">{q.hint}</span>}
          </>
        ) : passed && q.type === 'date' ? (
          <span className="qf-good">答對了 ♡</span>
        ) : (
          q.note || (q.type === 'text' ? '輸入完按 Enter 或點其他地方確認' : '')
        )}
      </div>
    </section>
  )
}
