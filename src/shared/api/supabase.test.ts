import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { runContract, type Harness } from './contract'
import { createSupabaseAdminApi, createSupabaseCardApi } from './supabase'
import { ApiError } from './types'

/**
 * 用 PGlite（在 Node 裡跑的真正 Postgres）執行 supabase/schema.sql，
 * 再用一個假的 fetch 把前端實際送出的 /rest/v1/rpc/<函式> 請求轉成 SQL，
 * 效果等同「前端 → PostgREST → 資料庫」整條路（只少了網路本身）。
 */

const SCHEMA = readFileSync(fileURLToPath(new URL('../../../supabase/schema.sql', import.meta.url)), 'utf8')
const URL_BASE = 'http://supabase.test'

let db: PGlite
const tokens = { card: '', admin: '' }

async function boot() {
  db = new PGlite()
  // Supabase 本來就有這幾個角色；PGlite 是空的，要先建
  await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin;`)
  await db.exec(SCHEMA)
  const r = await db.query<{ card_token: string; admin_token: string }>('select * from app.rotate_tokens()')
  tokens.card = r.rows[0].card_token
  tokens.admin = r.rows[0].admin_token
}

/** 模擬 PostgREST：把 POST /rest/v1/rpc/<fn> 的 JSON 內容轉成具名參數的函式呼叫，並以 anon 角色執行 */
const fakeFetch: typeof fetch = async (input, init) => {
  const fn = String(input).split('/rpc/')[1]
  const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>
  const keys = Object.keys(body)
  const params = keys.map((k) => (body[k] !== null && typeof body[k] === 'object' ? JSON.stringify(body[k]) : body[k]))
  const sql = `select public.${fn}(${keys.map((k, i) => `${k} => $${i + 1}`).join(', ')}) as r`
  await db.exec('set role anon')
  try {
    const res = await db.query<{ r: unknown }>(sql, params)
    return new Response(JSON.stringify(res.rows[0].r), { status: 200 })
  } catch (e) {
    const err = e as { message?: string; code?: string }
    return new Response(JSON.stringify({ code: err.code ?? '', message: err.message ?? '' }), { status: 400 })
  } finally {
    await db.exec('reset role')
  }
}

const config = { url: URL_BASE, anonKey: 'eyJ-test-anon-key', fetchImpl: fakeFetch }

const harness = async (): Promise<Harness> => ({
  async reset() {
    const r = await db.query<{ t: string }>('select app.reset_card() as t')
    tokens.card = r.rows[0].t
  },
  async setNow(iso) {
    await db.exec(`set app.now_override = '${iso}'`)
  },
  card: (t = 'ok') => createSupabaseCardApi(t === 'ok' ? tokens.card : 'nope', config),
  admin: (t = 'ok') => createSupabaseAdminApi(t === 'ok' ? tokens.admin : t === 'card' ? tokens.card : 'nope', config),
})

beforeAll(boot, 60_000)
afterAll(() => db.close())

// 同一組契約測試，跑在真正的 SQL 上
runContract('Supabase（PGlite 執行 schema.sql）', async () => harness())

const errorOf = async (p: Promise<unknown>) =>
  p.then(
    () => 'ok',
    (e: unknown) => (e instanceof Error ? e.message : String(e)),
  )

describe('資料庫本身的保護', () => {
  it('anon 角色碰不到 app schema 的任何資料表與函式', async () => {
    await db.exec('set role anon')
    try {
      expect(await errorOf(db.query('select * from app.transactions'))).toMatch(/permission denied/)
      expect(await errorOf(db.query('select * from app.card'))).toMatch(/permission denied/)
      expect(await errorOf(db.query('select app.reset_card()'))).toMatch(/permission denied/)
      expect(await errorOf(db.query('select * from app.rotate_tokens()'))).toMatch(/permission denied/)
    } finally {
      await db.exec('reset role')
    }
  })

  it('anon 只能呼叫那 10 個對外函式', async () => {
    const r = await db.query<{ proname: string }>(
      `select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute') order by 1`,
    )
    expect(r.rows.map((x) => x.proname)).toEqual([
      'admin_state',
      'admin_topup',
      'admin_unlock',
      'admin_void',
      'card_activate',
      'card_claim_gift',
      'card_set_lock',
      'card_spend',
      'card_state',
      'card_update_profile',
    ])
  })

  it('流水帳只能新增：UPDATE / DELETE 都被擋下，金額與種類也要符合規則', async () => {
    await harness().then((h) => h.reset())
    await createSupabaseCardApi(tokens.card, config).activate({ name: 'QQ', firstMeet: 'a', favGift: 'b', dessert: 'c' })
    expect(await errorOf(db.exec(`update app.transactions set amount = 1`))).toBe('LEDGER_IS_APPEND_ONLY')
    expect(await errorOf(db.exec(`delete from app.transactions`))).toBe('LEDGER_IS_APPEND_ONLY')
    expect(await errorOf(db.exec(`insert into app.transactions (kind, title, amount) values ('spend', 'x', 5)`))).toMatch(
      /amount_matches_kind/,
    )
    expect(await errorOf(db.exec(`insert into app.transactions (kind, title, amount) values ('gift', 'x', 5)`))).toMatch(
      /amount_matches_kind/,
    )
    expect(await errorOf(db.exec(`insert into app.transactions (kind, title, amount) values ('initial', 'x', 5)`))).toMatch(/duplicate key/)
  })

  it('通行碼只存雜湊，資料庫裡找不到原文', async () => {
    const r = await db.query<{ card_token_hash: string; admin_token_hash: string }>(
      'select card_token_hash, admin_token_hash from app.card',
    )
    const { card_token_hash, admin_token_hash } = r.rows[0]
    expect(card_token_hash).toMatch(/^[0-9a-f]{64}$/)
    expect(card_token_hash).not.toBe(tokens.card)
    expect(admin_token_hash).not.toBe(tokens.admin)
    expect(tokens.card).toMatch(/^[0-9a-f]{64}$/)
    expect(tokens.admin).not.toBe(tokens.card)
  })

  it('重置：流水帳清空、卡片尚未開卡、她的舊通行碼失效、後台通行碼不變', async () => {
    const h = await harness()
    await h.reset()
    const oldCard = tokens.card
    await h.card().activate({ name: 'QQ', firstMeet: 'a', favGift: 'b', dessert: 'c' })
    await h.card().spend({ title: '手搖飲', amount: 65, requestId: 'r-reset-1' })

    const fresh = await db.query<{ t: string }>('select app.reset_card() as t')
    tokens.card = fresh.rows[0].t

    expect(tokens.card).not.toBe(oldCard)
    const rejected = await createSupabaseCardApi(oldCard, config)
      .getState()
      .then(
        () => 'ok',
        (e: unknown) => (e instanceof ApiError ? e.code : 'other'),
      )
    expect(rejected).toBe('INVALID_TOKEN')

    const s = await h.card().getState()
    expect(s.activated).toBe(false)
    expect(s.profile).toBeNull()
    expect(s.transactions).toEqual([])
    expect((await h.admin().getState()).activated).toBe(false) // 後台通行碼沒變，仍然可用

    // 可以重新開卡，而且 request_id 也被清掉了（同一個 id 又能用）
    await h.card().activate({ name: 'Ning', firstMeet: 'a', favGift: 'b', dessert: 'c' })
    const again = await h.card().spend({ title: '手搖飲', amount: 65, requestId: 'r-reset-1' })
    expect(again.transactions.filter((t) => t.kind === 'spend')).toHaveLength(1)
  })

  it('回傳的時間是 UTC ISO 格式，前端可以直接排序與解析', async () => {
    const h = await harness()
    await h.reset()
    await h.setNow('2026-10-08T12:34:56.789+08:00')
    const s = await h.card().activate({ name: 'QQ', firstMeet: 'a', favGift: 'b', dessert: 'c' })
    expect(s.transactions[0].createdAt).toBe('2026-10-08T04:34:56.789Z')
    expect(s.activatedAt).toBe('2026-10-08T04:34:56.789Z')
    expect(s.serverTime).toBe('2026-10-08T04:34:56.789Z')
  })
})

describe('schema.sql 可以重複執行', () => {
  it('重跑不會出錯，也不會動到既有資料、通行碼與設定', async () => {
    const h = await harness()
    await h.reset()
    await h.card().activate({ name: 'QQ', firstMeet: 'a', favGift: 'b', dessert: 'c' })
    await h.card().spend({ title: '手搖飲', amount: 65, requestId: 'r-idem-1' })
    const before = await h.card().getState()

    await db.exec(SCHEMA)
    await db.exec(SCHEMA)

    const after = await h.card().getState() // 同一組通行碼仍然有效
    expect(after.transactions.map((t) => t.id)).toEqual(before.transactions.map((t) => t.id))
    expect(after.profile).toEqual(before.profile)
    const settings = await db.query<{ initial_credit: number }>('select initial_credit from app.settings')
    expect(settings.rows).toHaveLength(1)
    expect((await db.query('select count(*)::int as n from app.gifts')).rows[0]).toEqual({ n: 2 })
  })
})
