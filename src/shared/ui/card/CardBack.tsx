import { BACK_MESSAGE, CVV } from '../../domain/config'
import Paw from '../Paw'
import Globe from './Globe'

/** 英文名用草寫字體時，只有首字大寫比較自然（NING → Ning）；中文名維持原樣 */
function signatureOf(name: string): string {
  const isLatin = /^[a-z\s.'-]+$/i.test(name)
  return isLatin ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() : name
}

/** 卡片背面：磁條、簽名欄、CVV 與暖心的話。樣式在 card.css */
export default function CardBack({ name }: { name: string }) {
  return (
    <div className="card-face card-back">
      <Globe className="cf-globe" />
      <div className="card-glare" />
      <div className="cb-stripe" />
      <div className="cb-row">
        <div className="cb-sign">
          <small>AUTHORIZED SIGNATURE</small>
          <span>{signatureOf(name)}</span>
        </div>
        <div className="cb-cvv">
          <small>CVV</small>
          <b>{CVV}</b>
        </div>
      </div>
      <div className="cb-note">＊CVV 是我的生日，要記得喔</div>
      <div className="cb-msg">
        <div className="cb-title">{BACK_MESSAGE.title}</div>
        {BACK_MESSAGE.zh.map((line) => (
          <p className="cb-zh" key={line}>
            {line}
          </p>
        ))}
        <p className="cb-en">{BACK_MESSAGE.en}</p>
      </div>
      <div className="cb-paws">
        <Paw />
        <Paw />
      </div>
      <div className="card-edge" />
    </div>
  )
}
