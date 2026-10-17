import { useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import CardBack from './card/CardBack'
import CardFront from './card/CardFront'

interface Props {
  name: string
  locked?: boolean
  /** 緩慢上下浮動 */
  float?: boolean
  /** 顯示正反面圓點 */
  dots?: boolean
  onFlip?: (back: boolean) => void
}

/** 滑鼠移動時，卡片最多傾斜的角度 */
const TILT_Y = 18
const TILT_X = 14

/**
 * 3D 紀念卡：點一下翻面（GSAP）、滑鼠移動時跟著傾斜（桌機）、光澤會定時掃過。
 * 結構是 wrap（透視）→ tilt（傾斜與浮動）→ inner（翻面）→ 正面／背面。
 */
export default function Card({ name, locked = false, float = true, dots = true, onFlip }: Props) {
  const wrap = useRef<HTMLDivElement>(null)
  const tilt = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const flipped = useRef(false)
  const tiltTo = useRef<{ rx?: (v: number) => void; ry?: (v: number) => void }>({})
  const [isBack, setIsBack] = useState(false)

  // 卡面所有尺寸都以 --u（卡片寬度的 1%）為單位，用 JS 量測，不依賴 container query，舊版 iOS 也能正確縮放
  useLayoutEffect(() => {
    const el = wrap.current
    if (!el) return
    const setUnit = () => el.style.setProperty('--u', `${el.clientWidth / 100}px`)
    setUnit()
    const observer = new ResizeObserver(setUnit)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const { contextSafe } = useGSAP(
    () => {
      tiltTo.current.rx = gsap.quickTo(tilt.current, 'rotationX', { duration: 0.6, ease: 'power3' })
      tiltTo.current.ry = gsap.quickTo(tilt.current, 'rotationY', { duration: 0.6, ease: 'power3' })
      if (float) gsap.to(tilt.current, { y: -7, duration: 2.8, ease: 'sine.inOut', yoyo: true, repeat: -1 })
      gsap.fromTo(
        '.card-sheen',
        { '--sx': '-80%' },
        { '--sx': '180%', duration: 2.2, ease: 'power2.inOut', repeat: -1, repeatDelay: 4.5, delay: 0.8 },
      )
    },
    { scope: wrap },
  )

  const flip = contextSafe(() => {
    flipped.current = !flipped.current
    setIsBack(flipped.current)
    onFlip?.(flipped.current)
    gsap.to(inner.current, { rotationY: flipped.current ? 180 : 0, duration: 1, ease: 'power3.inOut' })
    gsap.fromTo(inner.current, { scale: 1 }, { scale: 0.92, duration: 0.5, yoyo: true, repeat: 1, ease: 'power2.inOut' })
  })

  const onPointerMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse' || !wrap.current) return
    const rect = wrap.current.getBoundingClientRect()
    const px = (e.clientX - rect.left) / rect.width
    const py = (e.clientY - rect.top) / rect.height
    tiltTo.current.ry?.((px - 0.5) * TILT_Y)
    tiltTo.current.rx?.(-(py - 0.5) * TILT_X)
    wrap.current.style.setProperty('--mx', `${px * 100}%`) // 光澤跟著游標
    wrap.current.style.setProperty('--my', `${py * 100}%`)
  }

  const onPointerLeave = () => {
    tiltTo.current.rx?.(0)
    tiltTo.current.ry?.(0)
  }

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
    flip()
  }

  return (
    <div className="card-wrap" ref={wrap} onPointerMove={onPointerMove} onPointerLeave={onPointerLeave}>
      <div className="card-tilt" ref={tilt}>
        <div
          className="card-inner"
          ref={inner}
          onClick={flip}
          role="button"
          tabIndex={0}
          aria-label={isBack ? '翻回正面' : '翻到背面'}
          onKeyDown={onKeyDown}
        >
          <CardFront name={name} locked={locked} />
          <CardBack name={name} />
        </div>
      </div>
      {dots && (
        <div className="card-dots">
          <button className={isBack ? '' : 'on'} aria-label="看正面" onClick={() => isBack && flip()} />
          <button className={isBack ? 'on' : ''} aria-label="看背面" onClick={() => !isBack && flip()} />
        </div>
      )}
    </div>
  )
}
