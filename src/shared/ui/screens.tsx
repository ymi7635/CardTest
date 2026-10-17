import { useRef, type ReactNode } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import Icon from './Icon'
import Paw from './Paw'

function ScreenShell({ children }: { children: ReactNode }) {
  const root = useRef<HTMLElement>(null)
  useGSAP(
    () => {
      gsap.from('.screen-in > *', { y: 24, autoAlpha: 0, stagger: 0.08, duration: 0.8, ease: 'expo.out' })
    },
    { scope: root },
  )
  return (
    <main className="screen" ref={root}>
      <div className="screen-in">{children}</div>
    </main>
  )
}

/** 載入中：三個腳印依序亮起 */
export function LoadingScreen() {
  const root = useRef<HTMLElement>(null)
  useGSAP(
    () => {
      gsap.fromTo(
        '.load-paws svg',
        { autoAlpha: 0.2, y: 6 },
        { autoAlpha: 1, y: 0, stagger: { each: 0.25, repeat: -1, yoyo: true }, duration: 0.5, ease: 'sine.inOut' },
      )
    },
    { scope: root },
  )
  return (
    <main className="screen" ref={root} aria-busy="true">
      <div className="screen-in">
        <div className="load-paws">
          <Paw />
          <Paw />
          <Paw />
        </div>
        <p className="screen-sub">載入中…</p>
      </div>
    </main>
  )
}

export function InvalidLinkScreen({ message = '這個連結不正確或已經失效，請向發卡人重新索取。' }: { message?: string }) {
  return (
    <ScreenShell>
      <span className="screen-ic">
        <Icon name="link" />
      </span>
      <h1>連結無效</h1>
      <p>{message}</p>
    </ScreenShell>
  )
}

export function FailedScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <ScreenShell>
      <span className="screen-ic">
        <Icon name="wifiOff" />
      </span>
      <h1>目前無法連線</h1>
      <p>請確認網路後再試一次。</p>
      <button className="btn btn-primary" onClick={onRetry}>
        <Icon name="refresh" /> 重試
      </button>
    </ScreenShell>
  )
}

/** 離線提示列：連不到伺服器但顯示的是上次的快取 */
export function OfflineBar({ text = '目前離線，顯示的是上次的資料' }: { text?: string }) {
  return (
    <div className="offline-bar" role="status">
      <Icon name="wifiOff" />
      {text}
    </div>
  )
}
