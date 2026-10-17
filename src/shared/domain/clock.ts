import { TZ } from './config'

// 開發用：網址加 ?now=2026-11-16 可以假裝「現在」是那一天（只在開發模式有效，打包後不存在）
let offset = 0
if (import.meta.env.DEV && typeof location !== 'undefined') {
  const raw = new URLSearchParams(location.search).get('now')
  if (raw) {
    const t = Date.parse(raw.includes('T') ? raw : `${raw}T12:00:00+08:00`)
    if (!Number.isNaN(t)) offset = t - Date.now()
  }
}

export const now = (): Date => new Date(Date.now() + offset)

export interface TaipeiParts {
  y: number
  m: number
  d: number
  hh: number
  mm: number
  /** YYYY-MM-DD，可直接字串比較先後 */
  ymd: string
}

const dtf = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

export function taipei(date: Date): TaipeiParts {
  const p: Record<string, number> = {}
  for (const part of dtf.formatToParts(date)) if (part.type !== 'literal') p[part.type] = Number(part.value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return { y: p.year, m: p.month, d: p.day, hh: p.hour, mm: p.minute, ymd: `${p.year}-${pad(p.month)}-${pad(p.day)}` }
}

const dayNo = (ymd: string): number => {
  const [y, m, d] = ymd.split('-').map(Number)
  return Math.round(Date.UTC(y, m - 1, d) / 864e5)
}

/** b - a 相差幾天（以日曆日計） */
export const diffDays = (aYmd: string, bYmd: string): number => dayNo(bYmd) - dayNo(aYmd)

/** 台北時間某年某月日的 00:00 */
export const taipeiMidnight = (ymd: string): Date => new Date(`${ymd}T00:00:00+08:00`)
