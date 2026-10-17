import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { createCardApi, WATCH_KEY, type SpendInput } from '../shared/api'
import type { Profile } from '../shared/domain/types'
import { loaded, useLedger, type Ledger, type LoadedLedger } from '../shared/hooks/useLedger'

interface CardActions {
  activate: (profile: Profile) => Promise<void>
  spend: (input: SpendInput) => Promise<void>
  claimGift: (giftKey: string) => Promise<void>
  setLock: (locked: boolean) => Promise<void>
  updateProfile: (patch: Partial<Profile>) => Promise<void>
}

interface Value {
  ledger: Ledger
  actions: CardActions
}

const Ctx = createContext<Value | null>(null)

/** 她的網站的資料來源：向後端抓狀態，並提供每個會改變資料的操作（成功後自動更新畫面） */
export function CardDataProvider({ children }: { children: ReactNode }) {
  const api = useMemo(() => createCardApi(), [])
  const ledger = useLedger(() => api.getState(), 'anniv-cache-card', WATCH_KEY)
  const { apply } = ledger

  const actions = useMemo<CardActions>(
    () => ({
      activate: async (profile) => apply(await api.activate(profile)),
      spend: async (input) => apply(await api.spend(input)),
      claimGift: async (giftKey) => apply(await api.claimGift(giftKey)),
      setLock: async (locked) => apply(await api.setLock(locked)),
      updateProfile: async (patch) => apply(await api.updateProfile(patch)),
    }),
    [api, apply],
  )

  return <Ctx.Provider value={{ ledger, actions }}>{children}</Ctx.Provider>
}

/** 資料可能還在載入中（最外層的閘門用：決定要顯示載入中、連結無效還是主畫面） */
export function useCardRemote(): Value {
  const value = useContext(Ctx)
  if (!value) throw new Error('useCardRemote 必須在 CardDataProvider 底下使用')
  return value
}

/** 資料已載入之後使用（首頁、明細、禮物、卡片頁、各種面板） */
export function useCardData(): LoadedLedger & { actions: CardActions } {
  const { ledger, actions } = useCardRemote()
  return { ...loaded(ledger), actions }
}
