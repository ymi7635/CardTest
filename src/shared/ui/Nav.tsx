import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import Icon, { type IconName } from './Icon'

export interface NavTab<K extends string> {
  key: K
  icon: IconName
  label: string
  /** 右上角小圓點（例如未處理數量） */
  badge?: number
}

interface Props<K extends string> {
  tabs: NavTab<K>[]
  active: K
  onChange: (key: K) => void
}

/** 底部浮動導覽列：選取指示塊用 GSAP 滑動 */
export default function Nav<K extends string>({ tabs, active, onChange }: Props<K>) {
  const root = useRef<HTMLElement>(null)
  const first = useRef(true)

  const place = (animate: boolean) => {
    const btn = root.current?.querySelector<HTMLElement>(`[data-t="${active}"]`)
    if (!btn) return
    const vars = { x: btn.offsetLeft, width: btn.offsetWidth }
    if (animate) gsap.to('.nav-pill', { ...vars, duration: 0.6, ease: 'expo.out' })
    else gsap.set('.nav-pill', vars)
  }

  useGSAP(
    () => {
      place(!first.current)
      first.current = false
      gsap.fromTo(`[data-t="${active}"] svg`, { y: 0 }, { y: -4, duration: 0.18, yoyo: true, repeat: 1, ease: 'power2.out' })
    },
    { scope: root, dependencies: [active] },
  )

  useEffect(() => {
    const onResize = () => place(false)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  })

  return (
    <nav className="nav" ref={root} aria-label="主選單">
      <i className="nav-pill" />
      {tabs.map((t) => (
        <button
          key={t.key}
          data-t={t.key}
          className={active === t.key ? 'on' : ''}
          onClick={() => onChange(t.key)}
          aria-current={active === t.key ? 'page' : undefined}
        >
          <Icon name={t.icon} />
          <span>{t.label}</span>
          {!!t.badge && <em className="nav-badge">{t.badge}</em>}
        </button>
      ))}
    </nav>
  )
}
