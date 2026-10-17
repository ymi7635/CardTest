import dog from '../../../assets/dog2.jpg'
import { ANNIVERSARY } from '../../domain/config'
import { dotDate } from '../../domain/format'
import Paw from '../Paw'
import Globe from './Globe'

interface Props {
  /** 印在卡面上的暱稱 */
  name: string
  locked: boolean
}

/** 卡片正面。所有尺寸都以 --u（卡片寬度的 1%）為單位，樣式在 card.css */
export default function CardFront({ name, locked }: Props) {
  const lastFour = ANNIVERSARY.slice(5).replace('-', '') // 卡號尾號：紀念日 1115

  return (
    <div className="card-face card-front">
      <img className="cf-photo" src={dog} alt="" draggable="false" />
      <Globe className="cf-globe" />
      <div className="card-sheen" />
      <div className="card-glare" />

      <div className="cf-chip">
        <span />
      </div>
      <svg className="cf-nfc" viewBox="0 0 30 50" aria-hidden="true">
        <path d="M5 18c4 4.5 4 9.5 0 14M12 11c7 8 7 20 0 28M19 4c10.5 11.5 10.5 30.5 0 42" />
      </svg>
      <div className="cf-tag">4 YEARS · 4 PAWS</div>

      <div className="cf-four">4</div>
      <div className="cf-title">週年紀念</div>
      <div className="cf-anni">ANNIVERSARY</div>
      <div className="cf-paws">
        <Paw />
        <Paw />
        <Paw />
        <Paw />
        <i className="cf-line" />
      </div>

      <div className="cf-number">
        <span>••••</span>
        <span>••••</span>
        <span>••••</span>
        <b>{lastFour}</b>
      </div>
      <div className="cf-name">{name}</div>
      <div className="cf-since">SINCE {dotDate(ANNIVERSARY)}</div>

      <div className="card-edge" />
      {locked && (
        <div className="card-lock">
          <span>🔒 卡片已鎖定</span>
        </div>
      )}
    </div>
  )
}
