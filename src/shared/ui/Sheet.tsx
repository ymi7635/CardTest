import { useRef, type ReactNode } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import Icon from './Icon'

interface Props {
  open: boolean
  /** 每次開啟換一個值，讓「已經開著時換內容」也能重播內容的進場動畫 */
  sheetKey: number
  onClose: () => void
  /** 關閉動畫播完之後 */
  onExited: () => void
  children: ReactNode
}

const REVEAL = { y: 18, autoAlpha: 0, stagger: 0.05, duration: 0.45, ease: 'power2.out', clearProps: 'opacity,visibility,transform' }

/** 從底部滑出的面板（含背景遮罩）；開關動畫都由 GSAP 負責 */
export default function Sheet({ open, sheetKey, onClose, onExited, children }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const wasOpen = useRef(false)

  useGSAP(
    () => {
      if (open && !wasOpen.current) {
        gsap.killTweensOf(['.sheet', '.sheet-backdrop'])
        gsap
          .timeline()
          .to('.sheet-backdrop', { autoAlpha: 1, duration: 0.35 }, 0)
          .fromTo('.sheet', { yPercent: 105 }, { yPercent: 0, duration: 0.6, ease: 'expo.out' }, 0)
          .from('.sheet-body > *', REVEAL, 0.12)
      } else if (open) {
        gsap.from('.sheet-body > *', { ...REVEAL, y: 14 })
      } else if (wasOpen.current) {
        gsap
          .timeline({ onComplete: onExited })
          .to('.sheet', { yPercent: 105, duration: 0.38, ease: 'power3.in' }, 0)
          .to('.sheet-backdrop', { autoAlpha: 0, duration: 0.3 }, 0.05)
      }
      wasOpen.current = open
      return () => {
        wasOpen.current = false
      }
    },
    { scope: root, dependencies: [open, sheetKey] },
  )

  return (
    <div className="sheet-root" ref={root}>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="sheet-grip" />
        <button className="sheet-x" onClick={onClose} aria-label="關閉">
          <Icon name="x" />
        </button>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  )
}
