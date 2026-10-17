import { useRef, useState } from 'react'
import { errorText, type ErrorMessages } from '../api/errors'

type Phase = 'idle' | 'busy' | 'done'

interface RunOptions {
  /** 各錯誤代碼要顯示的文字，沒列到的用共通說明 */
  messages?: ErrorMessages
  /** 其他錯誤的說明 */
  fallback?: string
  /** 失敗時額外要做的事（例如重新抓資料） */
  onError?: (e: unknown) => void
}

/**
 * 面板裡「按下送出」的共同流程：送出中（防連點）→ 成功／失敗（顯示錯誤文字）。
 * run 回傳是否成功，成功時 phase 變成 'done'。
 */
export function useSheetAction() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState('')
  const busyRef = useRef(false)

  const run = async (action: () => Promise<void>, { messages = {}, fallback = '操作失敗，請稍後再試', onError }: RunOptions = {}) => {
    if (busyRef.current) return false
    busyRef.current = true
    setPhase('busy')
    setError('')
    try {
      await action()
      setPhase('done')
      return true
    } catch (e) {
      setPhase('idle')
      setError(errorText(e, messages, fallback))
      onError?.(e)
      return false
    } finally {
      busyRef.current = false
    }
  }

  return { phase, busy: phase === 'busy', done: phase === 'done', error, setError, run }
}
