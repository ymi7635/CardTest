import { describe, expect, it } from 'vitest'
import { errorText } from './errors'
import { ApiError } from './types'

describe('errorText', () => {
  it('畫面自己的說明優先', () => {
    expect(errorText(new ApiError('INSUFFICIENT'), { INSUFFICIENT: '餘額已經變動' }, '失敗')).toBe('餘額已經變動')
  })

  it('沒有自己的說明就用共通說明', () => {
    expect(errorText(new ApiError('NETWORK'), {}, '失敗')).toBe('網路不穩，請稍後再試')
    expect(errorText(new ApiError('LOCKED'), {}, '失敗')).toBe('卡片已鎖定，請先解鎖')
  })

  it('其他錯誤、不是 ApiError 的錯誤都用 fallback', () => {
    expect(errorText(new ApiError('NOT_FOUND'), {}, '失敗')).toBe('失敗')
    expect(errorText(new Error('boom'), { NETWORK: 'x' }, '失敗')).toBe('失敗')
    expect(errorText('字串', {}, '失敗')).toBe('失敗')
  })
})
