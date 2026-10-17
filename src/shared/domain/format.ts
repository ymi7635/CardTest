import { taipei } from './clock'

export const fmt = (n: number): string => n.toLocaleString('en-US')

/** +1,000 或 -680 */
export const signed = (n: number): string => (n > 0 ? '+' : n < 0 ? '-' : '') + fmt(Math.abs(n))

export const dotDate = (ymd: string): string => ymd.replace(/-/g, '.')

const pad = (n: number) => String(n).padStart(2, '0')

/** 今天 14:05／昨天 09:30／10/8 21:00／2025/12/31 */
export function dateLabel(iso: string, at: Date): string {
  const t = taipei(new Date(iso))
  const today = taipei(at)
  const time = `${pad(t.hh)}:${pad(t.mm)}`
  if (t.ymd === today.ymd) return `今天 ${time}`
  const y = taipei(new Date(at.getTime() - 864e5))
  if (t.ymd === y.ymd) return `昨天 ${time}`
  if (t.y === today.y) return `${t.m}/${t.d} ${time}`
  return `${t.y}/${t.m}/${t.d}`
}

export function fullDateTime(iso: string): string {
  const t = taipei(new Date(iso))
  return `${t.y}/${t.m}/${t.d} ${pad(t.hh)}:${pad(t.mm)}`
}

export function greeting(at: Date): string {
  const h = taipei(at).hh
  return h < 5 ? 'GOOD NIGHT' : h < 12 ? 'GOOD MORNING' : h < 18 ? 'GOOD AFTERNOON' : 'GOOD EVENING'
}
