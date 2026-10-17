import { useCallback, useState } from 'react'

/** 只存在這支手機上的小偏好（例如「隱藏餘額」），不進資料庫 */
export function useLocalFlag(key: string, initial = false): [boolean, () => void] {
  const [value, setValue] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem(key)
      return v === null ? initial : v === '1'
    } catch {
      return initial
    }
  })
  const toggle = useCallback(() => {
    setValue((v) => {
      const next = !v
      try {
        localStorage.setItem(key, next ? '1' : '0')
      } catch {
        /* 不能存就只在這次有效 */
      }
      return next
    })
  }, [key])
  return [value, toggle]
}
