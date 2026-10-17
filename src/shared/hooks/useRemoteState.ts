import { useCallback, useEffect, useRef, useState } from 'react'
import { POLL_MS } from '../domain/config'
import { isApiError } from '../api'

export type RemoteStatus = 'loading' | 'ready' | 'invalid' | 'failed'

export interface Remote<T> {
  status: RemoteStatus
  data: T | null
  /** 最近一次連線失敗（畫面顯示快取內容並提示離線） */
  offline: boolean
  refreshing: boolean
  refresh: () => Promise<void>
  /** 把伺服器回傳的最新資料寫回（動作成功後使用） */
  apply: (next: T) => void
}

function readCache<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeCache(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* 寫不進去（隱私模式等）就算了，快取只是加速用 */
  }
}

/**
 * 以伺服器為準的資料：
 *  - 先用 localStorage 快取立刻顯示，再向伺服器更新（stale-while-revalidate）
 *  - 畫面可見時每 POLL_MS 自動更新；切回分頁、恢復網路、其他分頁寫入模擬資料庫時也會更新
 *  - 通行碼無效 → status 'invalid'；連不上 → 保留快取並標記 offline
 */
export function useRemoteState<T>(load: () => Promise<T>, cacheKey: string, watchKey?: string): Remote<T> {
  const [data, setData] = useState<T | null>(() => readCache<T>(cacheKey))
  const [status, setStatus] = useState<RemoteStatus>(() => (readCache<T>(cacheKey) ? 'ready' : 'loading'))
  const [offline, setOffline] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const seq = useRef(0)
  const loadRef = useRef(load)
  loadRef.current = load

  const apply = useCallback(
    (next: T) => {
      seq.current += 1 // 讓還在途中的舊請求作廢
      setData(next)
      setStatus('ready')
      setOffline(false)
      writeCache(cacheKey, next)
    },
    [cacheKey],
  )

  const refresh = useCallback(async () => {
    const mine = ++seq.current
    setRefreshing(true)
    try {
      const next = await loadRef.current()
      if (mine !== seq.current) return
      setData(next)
      setStatus('ready')
      setOffline(false)
      writeCache(cacheKey, next)
    } catch (e) {
      if (mine !== seq.current) return
      if (isApiError(e) && e.code === 'INVALID_TOKEN') {
        setStatus('invalid')
        setData(null)
        writeCache(cacheKey, null)
      } else if (isApiError(e) && e.code === 'NETWORK') {
        setOffline(true)
        setStatus((s) => (s === 'loading' ? 'failed' : s))
      } else {
        setStatus((s) => (s === 'loading' ? 'failed' : s))
      }
    } finally {
      if (mine === seq.current) setRefreshing(false)
    }
  }, [cacheKey])

  useEffect(() => {
    void refresh()
    const tick = () => document.visibilityState === 'visible' && void refresh()
    const timer = setInterval(tick, POLL_MS)
    const onStorage = (e: StorageEvent) => (!watchKey || e.key === watchKey) && void refresh()
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('online', tick)
    window.addEventListener('focus', tick)
    window.addEventListener('storage', onStorage)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('online', tick)
      window.removeEventListener('focus', tick)
      window.removeEventListener('storage', onStorage)
    }
  }, [refresh, watchKey])

  return { status, data, offline, refreshing, refresh, apply }
}
