import { useRef, type ReactNode } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

interface Props {
  title: string
  children: ReactNode
  actions: ReactNode
}

/** 面板裡的成功畫面：打勾圈彈出並畫出勾勾，文字依序浮現 */
export default function Success({ title, children, actions }: Props) {
  const root = useRef<HTMLDivElement>(null)
  useGSAP(
    () => {
      gsap
        .timeline()
        .from('.ok-ring', { scale: 0, duration: 0.7, ease: 'back.out(2.2)' })
        .fromTo('.ok-ring path', { strokeDashoffset: 30 }, { strokeDashoffset: 0, duration: 0.5, ease: 'power2.out' }, 0.3)
        .from('.ok-ring-pulse', { scale: 0.6, autoAlpha: 1, duration: 1.2, ease: 'expo.out' }, 0.2)
        .from('.ok-txt > *', { y: 14, autoAlpha: 0, stagger: 0.08, duration: 0.5, ease: 'power2.out' }, 0.25)
    },
    { scope: root },
  )
  return (
    <div className="ok" ref={root}>
      <div className="ok-icon">
        <span className="ok-ring-pulse" />
        <svg className="ok-ring" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 12.5l4 4L18 8" />
        </svg>
      </div>
      <div className="ok-txt">
        <h3>{title}</h3>
        <p>{children}</p>
        <div className="sheet-actions">{actions}</div>
      </div>
    </div>
  )
}
