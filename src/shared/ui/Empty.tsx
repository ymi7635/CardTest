import Paw from './Paw'

/** 清單沒有內容時的提示 */
export default function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <Paw />
      <p>{text}</p>
    </div>
  )
}
