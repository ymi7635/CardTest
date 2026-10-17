import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Sheet from './Sheet'
import Toast from './Toast'

interface UIContext {
  /** 打開底部面板（已經開著就換內容） */
  openSheet: (content: ReactNode) => void
  closeSheet: () => void
  /** 顯示一則短暫提示 */
  toast: (text: string) => void
}

const Ctx = createContext<UIContext | null>(null)

export function useUI(): UIContext {
  const value = useContext(Ctx)
  if (!value) throw new Error('useUI 必須在 UIProvider 底下使用')
  return value
}

interface SheetState {
  content: ReactNode
  key: number
  open: boolean
}

/**
 * 面板與提示的全域管理。
 * 面板內容是從這裡渲染的，所以資料用的 Provider（CardDataProvider / AdminDataProvider）必須包在它外面。
 */
export function UIProvider({ children }: { children: ReactNode }) {
  const [sheet, setSheet] = useState<SheetState>({ content: null, key: 0, open: false })
  const [toasts, setToasts] = useState<{ id: number; text: string }[]>([])
  const toastId = useRef(0)

  const openSheet = useCallback((content: ReactNode) => setSheet((s) => ({ content, key: s.key + 1, open: true })), [])
  const closeSheet = useCallback(() => setSheet((s) => ({ ...s, open: false })), [])
  const clearSheet = useCallback(() => setSheet((s) => (s.open ? s : { ...s, content: null })), [])
  const toast = useCallback((text: string) => setToasts((list) => [...list, { id: ++toastId.current, text }]), [])
  const dropToast = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), [])

  // 面板打開時鎖住背景捲動（避免 iOS 拖動面板時整頁一起滑）
  useEffect(() => {
    document.documentElement.classList.toggle('scroll-lock', !!sheet.content)
  }, [sheet.content])

  const value = useMemo(() => ({ openSheet, closeSheet, toast }), [openSheet, closeSheet, toast])

  return (
    <Ctx.Provider value={value}>
      {children}
      {sheet.content && (
        <Sheet open={sheet.open} sheetKey={sheet.key} onClose={closeSheet} onExited={clearSheet}>
          {sheet.content}
        </Sheet>
      )}
      <div className="toasts">
        {toasts.map((t) => (
          <Toast key={t.id} text={t.text} onDone={() => dropToast(t.id)} />
        ))}
      </div>
    </Ctx.Provider>
  )
}
