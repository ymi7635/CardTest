import type { ReactNode } from 'react'

/** 區塊標題，右側可以放一個操作（例如「查看全部」） */
export default function SectionHead({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="sec-head">
      <h3>{title}</h3>
      {action}
    </div>
  )
}
