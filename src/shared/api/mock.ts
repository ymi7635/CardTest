import { now } from '../domain/clock'
import { uid } from '../domain/id'
import { INITIAL_CREDIT, ANNIV_TOPUP, GIFTS, PROFILE_FIELDS } from '../domain/config'
import {
  annivMoment,
  balanceOf,
  claimedGifts,
  checkGift,
  checkSpend,
  checkTopup,
  checkVoid,
  dueAnnivYears,
  isVoidable,
  voidedIds,
} from '../domain/rules'
import type { Profile, Tx, TxKind } from '../domain/types'
import { ApiError, type AdminApi, type CardApi, type CardState, type Role } from './types'

/**
 * 本機模擬後端：資料存在 localStorage，讓「她的網站」和「後台」在同一個瀏覽器裡共用同一份資料。
 * 規則與驗證全部呼叫 domain/rules，和日後資料庫函式的行為保持一致。
 */

const DB_KEY = 'anniv-mock-db'
const OFFLINE_KEY = 'anniv-mock-offline'

interface Db {
  card: { activated: boolean; locked: boolean; profile: Profile | null; activatedAt: string | null }
  txs: Tx[]
  requests: string[]
  lastTs: number
}

const fresh = (): Db => ({
  card: { activated: false, locked: false, profile: null, activatedAt: null },
  txs: [],
  requests: [],
  lastTs: 0,
})

function load(): Db {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) return { ...fresh(), ...(JSON.parse(raw) as Db) }
  } catch {
    /* 讀不到就當作全新 */
  }
  return fresh()
}

const save = (db: Db) => localStorage.setItem(DB_KEY, JSON.stringify(db))

const isTest = import.meta.env.MODE === 'test'
const delay = () => (isTest ? Promise.resolve() : new Promise<void>((r) => setTimeout(r, 220 + Math.random() * 260)))

function guard(role: Role, token: string | null) {
  if (typeof localStorage !== 'undefined' && localStorage.getItem(OFFLINE_KEY) === '1') throw new ApiError('NETWORK')
  // 模擬模式：沒帶通行碼視為示範用；帶了就必須是 demo-card / demo-admin
  if (token !== null && token !== `demo-${role}`) throw new ApiError('INVALID_TOKEN')
}

/** 單調遞增的時間戳，避免同一毫秒的兩筆排序不穩 */
function stamp(db: Db): string {
  const t = Math.max(now().getTime(), db.lastTs + 1)
  db.lastTs = t
  return new Date(t).toISOString()
}

function add(db: Db, kind: TxKind, title: string, amount: number, extra: { note?: string; ref?: string; at?: Date } = {}): Tx {
  const tx: Tx = {
    id: uid(),
    kind,
    title,
    amount,
    note: extra.note ?? null,
    createdAt: extra.at ? extra.at.toISOString() : stamp(db),
    ref: extra.ref ?? null,
  }
  db.txs.push(tx)
  return tx
}

/** 每次讀取時補發還沒發的紀念日加值 */
function syncAnniversary(db: Db) {
  if (!db.card.activated || !db.card.activatedAt) return
  const issued = new Set(db.txs.filter((t) => t.kind === 'anniv' && t.ref).map((t) => t.ref as string))
  for (const y of dueAnnivYears(db.card.activatedAt, now(), issued)) {
    add(db, 'anniv', `${y} 紀念日加值`, ANNIV_TOPUP, { ref: String(y), at: annivMoment(y) })
  }
}

const view = (db: Db): CardState => ({
  activated: db.card.activated,
  locked: db.card.locked,
  profile: db.card.profile,
  activatedAt: db.card.activatedAt,
  transactions: structuredClone(db.txs),
  serverTime: now().toISOString(),
})

/** 先同步、跑完 fn、存檔，再回傳最新狀態 */
async function run(role: Role, token: string | null, fn: (db: Db) => void): Promise<CardState> {
  await delay()
  guard(role, token)
  const db = load()
  syncAnniversary(db)
  fn(db)
  save(db)
  return view(db)
}

const requireActive = (db: Db) => {
  if (!db.card.activated) throw new ApiError('NOT_ACTIVATED')
}

export function createMockCardApi(token: string | null): CardApi {
  return {
    getState: () => run('card', token, () => {}),

    activate: (profile) =>
      run('card', token, (db) => {
        if (db.card.activated) throw new ApiError('ALREADY_ACTIVATED')
        const clean = {} as Profile
        for (const f of PROFILE_FIELDS) {
          const v = (profile[f.key] ?? '').trim()
          if (!v || v.length > (f.maxLength ?? 30)) throw new ApiError('INVALID_INPUT')
          clean[f.key] = v
        }
        db.card = { activated: true, locked: false, profile: clean, activatedAt: stamp(db) }
        add(db, 'initial', '初始額度', INITIAL_CREDIT)
      }),

    spend: ({ title, amount, requestId }) =>
      run('card', token, (db) => {
        requireActive(db)
        if (db.requests.includes(requestId)) return // 重送：已經處理過，直接回傳目前狀態
        const err = checkSpend({ title, amount }, balanceOf(db.txs), db.card.locked)
        if (err) throw new ApiError(err)
        add(db, 'spend', title.trim(), -amount)
        db.requests.push(requestId)
      }),

    claimGift: (giftKey) =>
      run('card', token, (db) => {
        requireActive(db)
        const err = checkGift(giftKey, claimedGifts(db.txs), db.card.locked)
        if (err) throw new ApiError(err)
        const gift = GIFTS.find((g) => g.key === giftKey)
        add(db, 'gift', gift ? gift.title : giftKey, 0, { ref: giftKey })
      }),

    setLock: (locked) =>
      run('card', token, (db) => {
        requireActive(db)
        db.card.locked = locked
      }),

    updateProfile: (patch) =>
      run('card', token, (db) => {
        requireActive(db)
        const next = { ...db.card.profile } as Profile
        for (const f of PROFILE_FIELDS) {
          const v = patch[f.key]
          if (v === undefined) continue
          const t = v.trim()
          if (!t || t.length > (f.maxLength ?? 30)) throw new ApiError('INVALID_INPUT')
          next[f.key] = t
        }
        db.card.profile = next
      }),
  }
}

export function createMockAdminApi(token: string | null): AdminApi {
  return {
    getState: () => run('admin', token, () => {}),

    topup: ({ amount, note, requestId }) =>
      run('admin', token, (db) => {
        requireActive(db)
        if (db.requests.includes(requestId)) return
        if (checkTopup({ amount, note })) throw new ApiError('INVALID_INPUT')
        add(db, 'topup', '儲值', amount, { note: note.trim() })
        db.requests.push(requestId)
      }),

    voidTx: ({ txId, reason }) =>
      run('admin', token, (db) => {
        requireActive(db)
        const target = db.txs.find((t) => t.id === txId)
        if (!target) throw new ApiError('NOT_FOUND')
        if (!isVoidable(target.kind)) throw new ApiError('INVALID_INPUT')
        if (voidedIds(db.txs).has(target.id)) throw new ApiError('ALREADY_VOIDED')
        if (!reason.trim() || reason.trim().length > 40) throw new ApiError('INVALID_INPUT')
        const err = checkVoid(target, balanceOf(db.txs))
        if (err) throw new ApiError(err)
        add(db, 'void', `沖銷：${target.title}`, -target.amount, { note: reason.trim(), ref: target.id })
      }),

    unlock: () =>
      run('admin', token, (db) => {
        requireActive(db)
        db.card.locked = false
      }),
  }
}

// ───────── 開發輔助（只在開發模式掛到 window）─────────

export const mockDev = {
  reset: () => localStorage.removeItem(DB_KEY),
  setOffline: (on: boolean) => (on ? localStorage.setItem(OFFLINE_KEY, '1') : localStorage.removeItem(OFFLINE_KEY)),
  DB_KEY,
}
