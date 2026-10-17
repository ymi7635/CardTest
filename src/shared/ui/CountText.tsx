import { useCountUp } from '../hooks/useCountUp'

interface Props {
  value: number
  /** 隱藏時顯示遮蔽字元（例如「隱藏餘額」） */
  hidden?: boolean
}

/** 會從 0 跳動到目標數字的文字；數字由 GSAP 直接寫入，React 不管理它的內容 */
export default function CountText({ value, hidden = false }: Props) {
  return <span ref={useCountUp(value, hidden)} />
}
