import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

const PIECES = Array.from({ length: 24 }, (_, i) => (i % 3 === 0 ? '♥' : i % 3 === 1 ? '✦' : '●'))

/** 兌換成功時的小煙火：愛心、星星、圓點從中央往外散開（只播放一次） */
export default function Confetti() {
  const root = useRef<HTMLDivElement>(null)
  useGSAP(
    () => {
      gsap.utils.toArray<HTMLElement>('i').forEach((piece) => {
        const angle = gsap.utils.random(0, Math.PI * 2)
        const distance = gsap.utils.random(90, 170)
        gsap.fromTo(
          piece,
          { x: 0, y: 0, scale: 0, autoAlpha: 1, rotation: 0 },
          {
            x: Math.cos(angle) * distance * 1.25,
            y: Math.sin(angle) * distance * 0.7,
            scale: gsap.utils.random(0.6, 1.3),
            rotation: gsap.utils.random(-160, 160),
            autoAlpha: 0,
            duration: gsap.utils.random(1, 1.7),
            ease: 'expo.out',
          },
        )
      })
    },
    { scope: root },
  )
  return (
    <div className="confetti" ref={root} aria-hidden="true">
      {PIECES.map((p, i) => (
        <i key={i}>{p}</i>
      ))}
    </div>
  )
}
