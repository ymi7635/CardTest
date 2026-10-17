import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

const STARS = Array.from({ length: 26 }, (_, i) => ({
  left: (i * 37) % 100,
  top: (i * 53 + 11) % 100,
  size: 1 + ((i * 7) % 3),
}))

export default function Background({ stars = true }: { stars?: boolean }) {
  const root = useRef<HTMLDivElement>(null)
  useGSAP(
    () => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
      gsap.utils.toArray<HTMLElement>('.blob').forEach((b, i) => {
        gsap.to(b, {
          x: () => gsap.utils.random(-90, 90),
          y: () => gsap.utils.random(-70, 110),
          scale: () => gsap.utils.random(0.85, 1.25),
          duration: 9 + i * 2,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          repeatRefresh: true,
        })
      })
      gsap.utils.toArray<HTMLElement>('.star').forEach((s) => {
        gsap.fromTo(
          s,
          { autoAlpha: 0.1 },
          {
            autoAlpha: 0.9,
            duration: gsap.utils.random(1.2, 3),
            repeat: -1,
            yoyo: true,
            delay: gsap.utils.random(0, 3),
            ease: 'sine.inOut',
          },
        )
      })
    },
    { scope: root },
  )

  return (
    <div className="bg" ref={root} aria-hidden="true">
      <div className="blob b1" />
      <div className="blob b2" />
      <div className="blob b3" />
      {stars &&
        STARS.map((s, i) => <i key={i} className="star" style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size }} />)}
      <div className="grain" />
    </div>
  )
}
