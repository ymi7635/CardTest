import { useRef, type ReactNode } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

/** 分頁容器：進場時，直接子元素與 .stagger 底下的項目由下往上依序浮現 */
export default function Page({ children, className = '' }: { children: ReactNode; className?: string }) {
  const root = useRef<HTMLElement>(null)
  useGSAP(
    () => {
      if (!root.current) return
      gsap.from(root.current.querySelectorAll(':scope > *:not(.stagger), :scope > .stagger > *'), {
        y: 36,
        autoAlpha: 0,
        stagger: 0.06,
        duration: 0.8,
        ease: 'expo.out',
        clearProps: 'transform,opacity,visibility',
      })
    },
    { scope: root },
  )
  return (
    <section className={`page ${className}`} ref={root}>
      {children}
    </section>
  )
}
