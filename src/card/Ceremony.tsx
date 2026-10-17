import { useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import Card from '../shared/ui/Card'
import Paw from '../shared/ui/Paw'
import SplitChars from '../shared/ui/SplitChars'

const BURST = Array.from({ length: 30 }, (_, i) => (i % 3 === 0 ? '♥' : i % 3 === 1 ? '✦' : '●'))

export default function Ceremony({ name, onDone }: { name: string; onDone: () => void }) {
  const root = useRef<HTMLElement>(null)
  const [opened, setOpened] = useState(false)

  const { contextSafe } = useGSAP(
    () => {
      gsap.set('.cer-final > *', { autoAlpha: 0, y: 24 })
      gsap
        .timeline({ defaults: { ease: 'expo.out' } })
        .from('.cer-eyebrow', { autoAlpha: 0, letterSpacing: '1em', duration: 1.4 })
        .from('.cer-title .ch', { yPercent: 120, autoAlpha: 0, stagger: 0.06, duration: 1.1 }, 0.2)
        .from('.cer-sub', { autoAlpha: 0, y: 12, duration: 0.8 }, 0.7)
        .from('.env', { y: -window.innerHeight * 0.7, rotation: -14, autoAlpha: 0, duration: 1.4, ease: 'bounce.out' }, 0.6)
        .from('.env-seal', { scale: 0, rotation: -180, duration: 0.9, ease: 'back.out(2)' }, 1.6)
        .from('.cer-tap', { autoAlpha: 0, y: 10, duration: 0.6 }, 2)
      gsap.to('.env-seal', { scale: 1.08, duration: 0.9, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 2.5 })
    },
    { scope: root },
  )

  const burst = contextSafe(() => {
    gsap.utils.toArray<HTMLElement>('.burst i').forEach((p) => {
      const a = gsap.utils.random(0, Math.PI * 2)
      const d = gsap.utils.random(110, 230)
      gsap.fromTo(
        p,
        { x: 0, y: 0, scale: 0, autoAlpha: 1, rotation: 0 },
        {
          x: Math.cos(a) * d,
          y: Math.sin(a) * d,
          scale: gsap.utils.random(0.6, 1.4),
          rotation: gsap.utils.random(-180, 180),
          autoAlpha: 0,
          duration: gsap.utils.random(1.1, 1.8),
          ease: 'expo.out',
        },
      )
    })
  })

  const open = contextSafe(() => {
    const el = root.current
    if (opened || !el) return
    setOpened(true)
    const card = el.querySelector<HTMLElement>('.env-card')
    const env = el.querySelector<HTMLElement>('.env')
    if (!card || !env) return
    const lift = () => -card.offsetHeight * 0.9
    const center = () => (env.offsetHeight - card.offsetHeight) / 2 - card.offsetTop

    gsap.killTweensOf('.env-seal')
    gsap
      .timeline({ defaults: { ease: 'power3.inOut' } })
      .to('.cer-tap, .cer-head', { autoAlpha: 0, y: -16, duration: 0.5 })
      .to('.env-seal', { scale: 1.4, autoAlpha: 0, rotation: 90, duration: 0.5, ease: 'back.in(2)' }, 0)
      .to('.env-flap', { rotationX: 180, duration: 0.8 }, 0.35)
      .set('.env-flap', { zIndex: 1 }, 0.75)
      .to('.env-card', { y: lift, duration: 1, ease: 'power2.out' }, 1.05)
      .set('.env-card', { zIndex: 10 })
      .to('.env-body', { y: () => window.innerHeight * 0.6, rotation: 6, autoAlpha: 0, duration: 1, ease: 'power3.in' }, '+=0.1')
      .to('.env-card', { y: center, scale: 1.12, duration: 1.1, ease: 'expo.out' }, '<0.45')
      .to('.env-card .card-inner', { rotationY: 360, duration: 1.4, ease: 'power3.inOut', clearProps: 'rotationY' }, '<')
      .add(burst, '-=0.4')
      .to('.cer-final > *', { autoAlpha: 1, y: 0, stagger: 0.12, duration: 0.9, ease: 'expo.out' }, '-=0.2')
  })

  const finish = contextSafe(() => {
    gsap.to(root.current, { autoAlpha: 0, scale: 1.04, duration: 0.6, ease: 'power2.in', onComplete: onDone })
  })

  return (
    <main className={`ceremony ${opened ? 'is-open' : ''}`} ref={root}>
      <div className="cer-head">
        <div className="cer-eyebrow eyebrow">APPROVED ✦ 審核通過</div>
        <h1 className="cer-title">
          <SplitChars text="妳的專屬卡片" />
          <br />
          <SplitChars text="已經寄到了" className="grad-text" />
        </h1>
        <p className="cer-sub">for {name}, with all my love</p>
      </div>

      <div className="env-stage">
        <div className="env">
          <div className="env-body">
            <div className="env-back" />
            <div className="env-pocket" />
            <div className="env-flap" />
            <button className="env-seal" onClick={open} aria-label="打開信封">
              <Paw />
            </button>
          </div>
          <div className="env-card">
            <Card name={name} float={false} dots={false} />
          </div>
          <div className="burst" aria-hidden="true">
            {BURST.map((c, i) => (
              <i key={i}>{c}</i>
            ))}
          </div>
        </div>
        <p className="cer-tap">輕觸封印，打開它</p>
      </div>

      <div className="cer-final">
        <div className="eyebrow">HAPPY 4TH ANNIVERSARY</div>
        <h2>
          Hi, <span className="grad-text">{name}</span>
        </h2>
        <p>
          這是只屬於妳的卡片
          <br />
          點一下卡片，看看背面寫了什麼 ♡
        </p>
        <button className="btn btn-primary btn-block" onClick={finish}>
          開始使用
        </button>
      </div>
    </main>
  )
}
