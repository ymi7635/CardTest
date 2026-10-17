import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { PROFILE_FIELDS, QUESTIONS } from '../../shared/domain/config'
import type { Profile } from '../../shared/domain/types'
import Icon from '../../shared/ui/Icon'
import SplitChars from '../../shared/ui/SplitChars'
import QuizField from './QuizField'
import { useQuizState } from './useQuizState'

interface Props {
  /** 通過所有問題並簽署後呼叫；失敗時丟出錯誤，畫面會恢復讓她重送 */
  onSubmit: (profile: Profile) => Promise<void>
}

/** 開卡問答：逐題解鎖 → 同意並簽署 → 送出。這個檔案負責畫面與動畫，規則在 useQuizState。 */
export default function Quiz({ onSubmit }: Props) {
  const root = useRef<HTMLElement>(null)
  const sections = useRef<(HTMLElement | null)[]>([])
  const inputs = useRef<(HTMLInputElement | null)[]>([])
  const focusNextOnUnlock = useRef(false)
  const prevActive = useRef(0)
  const [agree, setAgree] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const { contextSafe } = useGSAP(
    () => {
      gsap
        .timeline({ defaults: { ease: 'expo.out' } })
        .from('.q-eyebrow', { y: 20, autoAlpha: 0, duration: 0.8 })
        .from('.q-title .ch', { yPercent: 110, rotate: 8, autoAlpha: 0, stagger: 0.045, duration: 1 }, 0.1)
        .from('.q-sub', { y: 16, autoAlpha: 0, duration: 0.8 }, 0.5)
        .from('.q-progress', { scaleX: 0, transformOrigin: 'left', duration: 1 }, 0.55)
        .from('.qf, .q-final', { y: 48, autoAlpha: 0, stagger: 0.07, duration: 1, clearProps: 'opacity,visibility,transform' }, 0.6)
    },
    { scope: root },
  )

  const shake = contextSafe((index: number) => {
    gsap.fromTo(sections.current[index], { x: 0 }, { keyframes: { x: [-12, 10, -8, 6, -3, 0] }, duration: 0.5, ease: 'power1.out' })
  })

  const { values, errors, tries, passed, active, allDone, change, commit } = useQuizState(shake)

  // 解鎖下一題時：彈跳、發光、捲到畫面中央，必要時聚焦
  useEffect(() => {
    const previous = prevActive.current
    prevActive.current = active
    if (active <= previous) return
    const el = sections.current[active] ?? root.current?.querySelector<HTMLElement>('.q-final')
    if (!el) return
    gsap.fromTo(el, { scale: 0.96 }, { scale: 1, duration: 0.8, ease: 'elastic.out(1, 0.5)' })
    gsap.fromTo(el, { '--glow': 1 }, { '--glow': 0, duration: 1.4, ease: 'power2.out' })
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    if (focusNextOnUnlock.current && QUESTIONS[active]?.type === 'text') {
      setTimeout(() => inputs.current[active]?.focus({ preventScroll: true }), 250)
    }
    focusNextOnUnlock.current = false
  }, [active])

  const submit = contextSafe(async () => {
    if (!allDone || !agree || leaving) return
    setLeaving(true)
    setSubmitError('')
    const profile = {} as Profile
    for (const f of PROFILE_FIELDS) profile[f.key] = values[f.key].trim()

    await gsap
      .timeline()
      .to('.q-final .btn', { scale: 0.94, duration: 0.15 })
      .to('.q-final .btn', { scale: 1, duration: 0.3, ease: 'back.out(3)' })
      .to('.q-wrap > *', { y: -40, autoAlpha: 0, stagger: 0.04, duration: 0.5, ease: 'power3.in' }, 0.2)
      .then()

    try {
      await onSubmit(profile)
    } catch (e) {
      console.error('開卡失敗', e)
      // 失敗：把畫面還原，答案都還在，讓她再按一次
      setSubmitError('開通失敗了，請確認網路後再試一次。')
      setLeaving(false)
      gsap.to('.q-wrap > *', {
        y: 0,
        autoAlpha: 1,
        stagger: 0.03,
        duration: 0.5,
        ease: 'expo.out',
        clearProps: 'transform,opacity,visibility',
      })
    }
  })

  return (
    <main className="quiz" ref={root}>
      <div className="q-wrap">
        <header className="q-head">
          <div className="q-eyebrow eyebrow">WELCOME · 2022 — 2026</div>
          <h1 className="q-title">
            <SplitChars text="開通妳的" />
            <br />
            <SplitChars text="專屬紀念卡" className="grad-text" />
          </h1>
          <p className="q-sub">回答幾個只有妳知道的問題，解鎖屬於妳的四週年卡片 ♡</p>
        </header>

        <div className="q-progress">
          <div className="q-bar">
            <i style={{ transform: `scaleX(${active / QUESTIONS.length})` }} />
          </div>
          <span>
            {active} / {QUESTIONS.length}
          </span>
        </div>

        {QUESTIONS.map((q, i) => {
          const locked = i > active
          return (
            <QuizField
              key={q.key}
              question={q}
              index={i}
              value={values[q.key]}
              locked={locked}
              passed={passed[i] && !locked}
              active={i === active}
              wrong={!!errors[q.key] && !locked}
              tries={tries[q.key] ?? 0}
              frozen={leaving}
              sectionRef={(el) => void (sections.current[i] = el)}
              inputRef={(el) => void (inputs.current[i] = el)}
              onChange={(value) => change(i, value)}
              onCommit={(value) => commit(i, value)}
              onEnter={(value) => {
                if (commit(i, value)) focusNextOnUnlock.current = true
              }}
            />
          )
        })}

        <section className={`q-final glass ${allDone ? '' : 'is-locked'}`}>
          <label className="agree">
            <input type="checkbox" checked={agree} disabled={!allDone} onChange={(e) => setAgree(e.target.checked)} />
            <span className="box">
              <Icon name="check" />
            </span>
            <span>我同意本行永久提供「無條件寵愛」服務，且額度用完前不得退貨。</span>
          </label>
          {submitError && <p className="q-submit-err">{submitError}</p>}
          <button className="btn btn-primary btn-block" disabled={!allDone || !agree || leaving} onClick={() => void submit()}>
            {allDone ? (
              '簽署並開通'
            ) : (
              <>
                <Icon name="lock" /> 完成所有問題後開通
              </>
            )}
          </button>
        </section>
      </div>
    </main>
  )
}
