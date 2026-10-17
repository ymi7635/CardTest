import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { balanceOf } from '../domain/rules'
import { ApiError, type AdminApi, type CardApi } from './types'

/**
 * API 契約測試：同一組情境同時跑在「本機模擬後端」與「Supabase（真正的 SQL）」上，
 * 確保兩邊的行為完全一致。各實作只需要提供 Harness。
 */
export interface Harness {
  /** 還原成「全新、從沒人用過」的狀態 */
  reset(): Promise<void>
  /** 讓後端的「現在」變成這個時間 */
  setNow(iso: string): Promise<void>
  /** 結束時的清理（可省略） */
  dispose?(): void
  card(token?: 'ok' | 'bad'): CardApi
  /** 'card' = 拿她的通行碼去敲後台 */
  admin(token?: 'ok' | 'bad' | 'card'): AdminApi
}

const profile = { name: 'QQ', firstMeet: '台北車站', favGift: '項鍊', dessert: '提拉米蘇' }
const code = async (p: Promise<unknown>) =>
  p.then(
    () => 'ok',
    (e: unknown) => (e instanceof ApiError ? e.code : `other:${String(e)}`),
  )

let rid = 0
const id = () => `req-${++rid}`

export function runContract(label: string, make: () => Promise<Harness>) {
  describe(`API 契約：${label}`, () => {
    let h: Harness
    beforeEach(async () => {
      h = await make()
      await h.reset()
      await h.setNow('2026-10-08T12:00:00+08:00')
    })
    afterEach(() => h.dispose?.())

    describe('開卡', () => {
      it('開卡寫入初始額度，且只能開一次', async () => {
        const card = h.card()
        expect((await card.getState()).activated).toBe(false)
        const s = await card.activate(profile)
        expect(s.activated).toBe(true)
        expect(s.profile).toEqual(profile)
        expect(balanceOf(s.transactions)).toBe(14520)
        expect(s.transactions[0].kind).toBe('initial')
        expect(await code(card.activate(profile))).toBe('ALREADY_ACTIVATED')
      })

      it('資料不完整、太長都不能開卡', async () => {
        const card = h.card()
        expect(await code(card.activate({ ...profile, name: ' ' }))).toBe('INVALID_INPUT')
        expect(await code(card.activate({ ...profile, name: 'x'.repeat(15) }))).toBe('INVALID_INPUT')
        expect(await code(card.activate({ ...profile, dessert: 'x'.repeat(21) }))).toBe('INVALID_INPUT')
        expect((await card.getState()).activated).toBe(false)
      })

      it('未開卡不能消費、兌換禮物、鎖卡', async () => {
        const card = h.card()
        expect(await code(card.spend({ title: 'a', amount: 1, requestId: id() }))).toBe('NOT_ACTIVATED')
        expect(await code(card.claimGift('anniv4-gift'))).toBe('NOT_ACTIVATED')
        expect(await code(card.setLock(true))).toBe('NOT_ACTIVATED')
      })
    })

    describe('通行碼', () => {
      it('錯誤的通行碼被拒絕，且她的通行碼進不了後台', async () => {
        expect(await code(h.card('bad').getState())).toBe('INVALID_TOKEN')
        expect(await code(h.card('bad').activate(profile))).toBe('INVALID_TOKEN')
        expect(await code(h.admin('bad').getState())).toBe('INVALID_TOKEN')
        expect(await code(h.admin('card').getState())).toBe('INVALID_TOKEN')
        expect(await code(h.card().getState())).toBe('ok')
        expect(await code(h.admin().getState())).toBe('ok')
      })
    })

    describe('消費', () => {
      it('扣款、餘額不足、鎖卡', async () => {
        const card = h.card()
        await card.activate(profile)
        let s = await card.spend({ title: '手搖飲', amount: 65, requestId: id() })
        expect(balanceOf(s.transactions)).toBe(14455)
        expect(await code(card.spend({ title: '房子', amount: 99999, requestId: id() }))).toBe('INSUFFICIENT')
        await card.setLock(true)
        expect(await code(card.spend({ title: '手搖飲', amount: 1, requestId: id() }))).toBe('LOCKED')
        s = await card.setLock(false)
        expect(s.locked).toBe(false)
      })

      it('剛好花光可以，多 1 元不行', async () => {
        const card = h.card()
        await card.activate(profile)
        expect(await code(card.spend({ title: '大餐', amount: 14521, requestId: id() }))).toBe('INSUFFICIENT')
        const s = await card.spend({ title: '大餐', amount: 14520, requestId: id() })
        expect(balanceOf(s.transactions)).toBe(0)
      })

      it('金額與項目名稱的驗證', async () => {
        const card = h.card()
        await card.activate(profile)
        const bad = async (title: string, amount: number) => code(card.spend({ title, amount, requestId: id() }))
        expect(await bad('手搖飲', 0)).toBe('INVALID_INPUT')
        expect(await bad('手搖飲', -5)).toBe('INVALID_INPUT')
        expect(await bad('  ', 10)).toBe('INVALID_INPUT')
        expect(await bad('x'.repeat(21), 10)).toBe('INVALID_INPUT')
        expect(await bad('x'.repeat(20), 10)).toBe('ok')
      })

      it('同一個 requestId 重送只會扣一次', async () => {
        const card = h.card()
        await card.activate(profile)
        const requestId = id()
        await card.spend({ title: '手搖飲', amount: 65, requestId })
        const s = await card.spend({ title: '手搖飲', amount: 65, requestId })
        expect(balanceOf(s.transactions)).toBe(14455)
        expect(s.transactions.filter((t) => t.kind === 'spend')).toHaveLength(1)
      })

      it('項目名稱頭尾空白會被去掉', async () => {
        const card = h.card()
        await card.activate(profile)
        const s = await card.spend({ title: '  手搖飲  ', amount: 65, requestId: id() })
        expect(s.transactions.find((t) => t.kind === 'spend')?.title).toBe('手搖飲')
      })

      it('可以修改暱稱等資料，但不能改成空白', async () => {
        const card = h.card()
        await card.activate(profile)
        const s = await card.updateProfile({ name: 'Ning' })
        expect(s.profile?.name).toBe('Ning')
        expect(s.profile?.dessert).toBe('提拉米蘇')
        expect(await code(card.updateProfile({ name: ' ' }))).toBe('INVALID_INPUT')
        expect((await card.getState()).profile?.name).toBe('Ning')
      })
    })

    describe('禮物兌換', () => {
      it('不扣額度、每項限一次、鎖卡時不能兌換、紀錄不能被沖銷', async () => {
        const card = h.card()
        const admin = h.admin()
        await card.activate(profile)

        let s = await card.claimGift('anniv4-gift')
        expect(balanceOf(s.transactions)).toBe(14520)
        const gift = s.transactions.find((t) => t.kind === 'gift')!
        expect(gift.title).toBe('四週年禮物')
        expect(gift.amount).toBe(0)
        expect(gift.ref).toBe('anniv4-gift')

        expect(await code(card.claimGift('anniv4-gift'))).toBe('ALREADY_CLAIMED')
        expect(await code(card.claimGift('unknown'))).toBe('INVALID_INPUT')

        await card.setLock(true)
        expect(await code(card.claimGift('anniv4-letter'))).toBe('LOCKED')
        await card.setLock(false)

        s = await card.claimGift('anniv4-letter')
        expect(s.transactions.filter((t) => t.kind === 'gift')).toHaveLength(2)
        expect(await code(admin.voidTx({ txId: gift.id, reason: '不行' }))).toBe('INVALID_INPUT')
      })
    })

    describe('後台', () => {
      it('儲值：金額與備註驗證，重送不重複', async () => {
        const card = h.card()
        const admin = h.admin()
        await card.activate(profile)
        expect(await code(admin.topup({ amount: 50001, note: 'x', requestId: id() }))).toBe('INVALID_INPUT')
        expect(await code(admin.topup({ amount: 100, note: '', requestId: id() }))).toBe('INVALID_INPUT')
        expect(await code(admin.topup({ amount: 0, note: 'x', requestId: id() }))).toBe('INVALID_INPUT')
        expect(await code(admin.topup({ amount: 50000, note: 'x', requestId: id() }))).toBe('ok')
        const requestId = id()
        await admin.topup({ amount: 1000, note: '補貼', requestId })
        const s = await admin.topup({ amount: 1000, note: '補貼', requestId })
        expect(balanceOf(s.transactions)).toBe(14520 + 50000 + 1000)
        expect(s.transactions.find((t) => t.kind === 'topup' && t.amount === 1000)?.note).toBe('補貼')
      })

      it('未開卡時不能儲值', async () => {
        expect(await code(h.admin().topup({ amount: 100, note: 'x', requestId: id() }))).toBe('NOT_ACTIVATED')
      })

      it('沖銷消費 = 退款；同一筆不能沖銷兩次；初始額度不能沖銷；找不到的 id', async () => {
        const card = h.card()
        const admin = h.admin()
        let s = await card.activate(profile)
        const initTx = s.transactions[0]
        s = await card.spend({ title: '手搖飲', amount: 65, requestId: id() })
        const spendTx = s.transactions.find((t) => t.kind === 'spend')!
        s = await admin.voidTx({ txId: spendTx.id, reason: '記錯了' })
        expect(balanceOf(s.transactions)).toBe(14520)
        const v = s.transactions.find((t) => t.kind === 'void')!
        expect(v.ref).toBe(spendTx.id)
        expect(v.amount).toBe(65)
        expect(v.note).toBe('記錯了')
        expect(await code(admin.voidTx({ txId: spendTx.id, reason: '再來一次' }))).toBe('ALREADY_VOIDED')
        expect(await code(admin.voidTx({ txId: initTx.id, reason: '不行' }))).toBe('INVALID_INPUT')
        expect(await code(admin.voidTx({ txId: '00000000-0000-4000-8000-000000000000', reason: '不存在' }))).toBe('NOT_FOUND')
        expect(await code(admin.voidTx({ txId: v.id, reason: '沖銷的沖銷' }))).toBe('INVALID_INPUT')
      })

      it('沖銷必須填原因', async () => {
        const card = h.card()
        const admin = h.admin()
        await card.activate(profile)
        const s = await card.spend({ title: '手搖飲', amount: 65, requestId: id() })
        const t = s.transactions.find((x) => x.kind === 'spend')!
        expect(await code(admin.voidTx({ txId: t.id, reason: ' ' }))).toBe('INVALID_INPUT')
        expect(await code(admin.voidTx({ txId: t.id, reason: 'x'.repeat(41) }))).toBe('INVALID_INPUT')
      })

      it('沖銷儲值時餘額不夠會被擋下', async () => {
        const card = h.card()
        const admin = h.admin()
        await card.activate(profile)
        let s = await admin.topup({ amount: 1000, note: '補貼', requestId: id() })
        const topupTx = s.transactions.find((t) => t.kind === 'topup')!
        await card.spend({ title: '大餐', amount: 15000, requestId: id() }) // 把錢花光
        s = await card.getState()
        expect(balanceOf(s.transactions)).toBe(520)
        expect(await code(admin.voidTx({ txId: topupTx.id, reason: '錯了' }))).toBe('INSUFFICIENT')
      })

      it('後台可以替她解鎖', async () => {
        const card = h.card()
        const admin = h.admin()
        await card.activate(profile)
        await card.setLock(true)
        const s = await admin.unlock()
        expect(s.locked).toBe(false)
      })
    })

    describe('紀念日自動加值', () => {
      it('11/15 之後第一次讀取就補發，且只發一次，不論是她還是後台先讀', async () => {
        const card = h.card()
        const admin = h.admin()
        await card.activate(profile)

        await h.setNow('2026-11-14T23:00:00+08:00')
        expect(balanceOf((await card.getState()).transactions)).toBe(14520)

        await h.setNow('2026-11-16T10:00:00+08:00') // 15 號那天沒人打開，16 號才開
        const a = await admin.getState()
        const b = await card.getState()
        expect(balanceOf(a.transactions)).toBe(14520 + 1115)
        expect(balanceOf(b.transactions)).toBe(14520 + 1115)
        const anniv = b.transactions.filter((t) => t.kind === 'anniv')
        expect(anniv).toHaveLength(1)
        expect(anniv[0].title).toBe('2026 紀念日加值')
        expect(anniv[0].ref).toBe('2026')
        expect(new Date(anniv[0].createdAt).toISOString()).toBe(new Date('2026-11-15T00:00:00+08:00').toISOString())
      })

      it('隔了好幾年才打開：每年補一筆', async () => {
        const card = h.card()
        await card.activate(profile)
        await h.setNow('2028-12-01T10:00:00+08:00')
        const s = await card.getState()
        expect(s.transactions.filter((t) => t.kind === 'anniv').map((t) => t.ref)).toEqual(['2026', '2027', '2028'])
        expect(balanceOf(s.transactions)).toBe(14520 + 1115 * 3)
      })

      it('用台北時間判斷：台北已經 11/15，UTC 還是 11/14 也算', async () => {
        const card = h.card()
        await card.activate(profile)
        await h.setNow('2026-11-14T16:30:00Z') // = 台北 11/15 00:30
        expect(balanceOf((await card.getState()).transactions)).toBe(14520 + 1115)
      })

      it('開卡當天剛好是紀念日，當天不發', async () => {
        await h.reset()
        await h.setNow('2026-11-15T10:00:00+08:00')
        const card = h.card()
        await card.activate(profile)
        expect(balanceOf((await card.getState()).transactions)).toBe(14520)
      })

      it('沖銷過的紀念日加值不會被重新發放', async () => {
        const card = h.card()
        const admin = h.admin()
        await card.activate(profile)
        await h.setNow('2026-11-16T10:00:00+08:00')
        let s = await admin.getState()
        const a = s.transactions.find((t) => t.kind === 'anniv')!
        s = await admin.voidTx({ txId: a.id, reason: '誤發' })
        expect(balanceOf(s.transactions)).toBe(14520)
        s = await card.getState()
        expect(s.transactions.filter((t) => t.kind === 'anniv')).toHaveLength(1)
        expect(balanceOf(s.transactions)).toBe(14520)
      })
    })
  })
}
