import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

/** 橫向無限跑馬燈（內容重複兩份，捲到一半時無縫接回開頭） */
export default function Marquee({ items }: { items: string[] }) {
  const root = useRef<HTMLDivElement>(null)
  useGSAP(
    () => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
      gsap.to('.mq-track', { xPercent: -50, duration: 28, ease: 'none', repeat: -1 })
    },
    { scope: root },
  )
  const row = items.map((text, i) => (
    <span key={i}>
      {text}
      <i>✦</i>
    </span>
  ))
  return (
    <div className="marquee" ref={root} aria-hidden="true">
      <div className="mq-track">
        {row}
        {row}
      </div>
    </div>
  )
}
