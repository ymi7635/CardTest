import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

/** 頂部的短暫提示：彈入、停留約 2.6 秒、淡出後呼叫 onDone */
export default function Toast({ text, onDone }: { text: string; onDone: () => void }) {
  const el = useRef<HTMLDivElement>(null)
  useGSAP(() => {
    gsap
      .timeline({ onComplete: onDone })
      .fromTo(el.current, { y: -30, autoAlpha: 0, scale: 0.9 }, { y: 0, autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(1.8)' })
      .to(el.current, { y: -20, autoAlpha: 0, duration: 0.35, ease: 'power2.in' }, '+=2.6')
  })
  return (
    <div className="toast" ref={el} role="status">
      {text}
    </div>
  )
}
