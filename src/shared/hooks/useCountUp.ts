import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { fmt } from '../domain/format'

/**
 * 數字跳動：GSAP 直接寫入元素的 textContent，React 不管理它的內容（避免每一幀都重新渲染）。
 * 回傳要綁在 <span ref=...> 上的 ref。hidden 時顯示遮蔽字元。
 */
export function useCountUp(value: number, hidden = false, mask = '••••••') {
  const el = useRef<HTMLSpanElement>(null)
  const state = useRef({ v: 0 })
  useGSAP(
    () => {
      const paint = () => {
        if (el.current) el.current.textContent = fmt(Math.round(state.current.v))
      }
      if (hidden) {
        gsap.killTweensOf(state.current)
        if (el.current) el.current.textContent = mask
        return
      }
      paint()
      gsap.to(state.current, { v: value, duration: 1.6, ease: 'expo.out', overwrite: true, onUpdate: paint })
    },
    { dependencies: [value, hidden] },
  )
  return el
}
