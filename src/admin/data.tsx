import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { createAdminApi, WATCH_KEY, type TopupInput, type VoidInput } from '../shared/api'
import { loaded, useLedger, type Ledger, type LoadedLedger } from '../shared/hooks/useLedger'

interface AdminActions {
  topup: (input: TopupInput) => Promise<void>
  voidTx: (input: VoidInput) => Promise<void>
  unlock: () => Promise<void>
}

interface Value {
  ledger: Ledger
  actions: AdminActions
}

const Ctx = createContext<Value | null>(null)

/** 後台的資料來源：向後端抓狀態，並提供每個會改變資料的操作（成功後自動更新畫面） */
export function AdminDataProvider({ children }: { children: ReactNode }) {
  const api = useMemo(() => createAdminApi(), [])
  const ledger = useLedger(() => api.getState(), 'anniv-cache-admin', WATCH_KEY)
  const { apply } = ledger

  const actions = useMemo<AdminActions>(
    () => ({
      topup: async (input) => apply(await api.topup(input)),
      voidTx: async (input) => apply(await api.voidTx(input)),
      unlock: async () => apply(await api.unlock()),
    }),
    [api, apply],
  )

  return <Ctx.Provider value={{ ledger, actions }}>{children}</Ctx.Provider>
}

/** 資料可能還在載入中（最外層的閘門用） */
export function useAdminRemote(): Value {
  const value = useContext(Ctx)
  if (!value) throw new Error('useAdminRemote 必須在 AdminDataProvider 底下使用')
  return value
}

/** 資料已載入之後使用（各個分頁與面板） */
export function useAdminData(): LoadedLedger & { actions: AdminActions } {
  const { ledger, actions } = useAdminRemote()
  return { ...loaded(ledger), actions }
}
