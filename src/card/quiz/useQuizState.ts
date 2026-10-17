import { useEffect, useRef, useState } from 'react'
import { QUESTIONS, type Question, type QuestionKey } from '../../shared/domain/config'

type QuizValues = Record<QuestionKey, string>

/** 觸控裝置上，停在錯誤日期多久之後就提示（iOS 選日期時欄位不一定會失去焦點） */
const WRONG_DATE_HINT_DELAY_MS = 1200

function isCorrect(question: Question, value: string): boolean {
  if (!value.trim()) return false
  return question.type === 'date' ? value === question.answer : true // 文字題只要有填就算過關
}

/**
 * 開卡問答的狀態與規則（不含任何畫面與動畫）：
 *  - 題目依序解鎖：第一個「還沒通過」的題目就是作答中，它之後的全部鎖住
 *  - 答案「確認」時才判斷對錯（按 Enter、離開欄位、日期答對時）
 *  - 答錯會記錄次數（答錯兩次出現提示）並呼叫 onWrong（讓畫面震動）
 */
export function useQuizState(onWrong: (questionIndex: number) => void) {
  const [values, setValues] = useState<QuizValues>(() => Object.fromEntries(QUESTIONS.map((q) => [q.key, ''])) as QuizValues)
  const [committed, setCommitted] = useState<Partial<QuizValues>>({})
  const [errors, setErrors] = useState<Partial<Record<QuestionKey, boolean>>>({})
  const [tries, setTries] = useState<Partial<Record<QuestionKey, number>>>({})
  const hintTimers = useRef<number[]>([])

  useEffect(() => () => hintTimers.current.forEach(clearTimeout), [])

  const passed = QUESTIONS.map((q) => committed[q.key] === values[q.key] && isCorrect(q, values[q.key]))
  const firstOpen = passed.indexOf(false)
  const active = firstOpen === -1 ? QUESTIONS.length : firstOpen
  const allDone = active === QUESTIONS.length

  /** 確認某一題的答案；回傳是否答對 */
  const commit = (index: number, value: string = values[QUESTIONS[index].key]): boolean => {
    const q = QUESTIONS[index]
    clearTimeout(hintTimers.current[index])
    const correct = isCorrect(q, value)
    const wrong = !correct && value.trim() !== ''
    setCommitted((c) => ({ ...c, [q.key]: value }))
    setErrors((e) => ({ ...e, [q.key]: wrong }))
    if (wrong) {
      setTries((t) => ({ ...t, [q.key]: (t[q.key] ?? 0) + 1 }))
      onWrong(index)
    }
    return correct
  }

  const change = (index: number, value: string) => {
    const q = QUESTIONS[index]
    setValues((v) => ({ ...v, [q.key]: value }))
    setErrors((e) => ({ ...e, [q.key]: false }))
    clearTimeout(hintTimers.current[index])
    if (q.type !== 'date') return
    // 日期答對立刻解鎖；答錯等離開欄位再提示，避免轉滾輪時一直跳錯誤
    if (isCorrect(q, value)) commit(index, value)
    else if (value && matchMedia('(pointer: coarse)').matches) {
      hintTimers.current[index] = window.setTimeout(() => commit(index, value), WRONG_DATE_HINT_DELAY_MS)
    }
  }

  return { values, errors, tries, passed, active, allDone, change, commit }
}
