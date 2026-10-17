/**
 * 表單下方的錯誤訊息。
 * 永遠佔著一行高度，有文字時才淡入，這樣出現／消失時面板不會跳動。
 */
export default function FormError({ text }: { text: string }) {
  return (
    <p className={`form-err ${text ? 'on' : ''}`} aria-live="polite">
      {text}
    </p>
  )
}
