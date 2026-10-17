import { GIFTS } from '../../shared/domain/config'
import { fullDateTime } from '../../shared/domain/format'
import { giftClaimTimes } from '../../shared/domain/rules'
import Icon from '../../shared/ui/Icon'
import Page from '../../shared/ui/Page'
import { useUI } from '../../shared/ui/UIProvider'
import { useCardData } from '../data'
import GiftSheet from '../sheets/GiftSheet'

export default function Gifts() {
  const { state } = useCardData()
  const { openSheet } = useUI()
  const claimedAt = giftClaimTimes(state.transactions)
  const left = GIFTS.length - claimedAt.size

  return (
    <Page>
      <div className="page-head">
        <span className="eyebrow">FOR OUR 4TH</span>
        <h2>四週年禮物</h2>
        <p>
          專屬於妳的禮物，不扣除額度，每項限兌換一次 ♡
          <br />
          {left > 0 ? `還有 ${left} 份等妳兌換` : '兩份禮物都兌換囉，等我準備驚喜'}
        </p>
      </div>

      <div className="gifts stagger">
        {GIFTS.map((g) => {
          const at = claimedAt.get(g.key)
          const done = at !== undefined
          return (
            <div className={`gift glass ${done ? 'is-claimed' : ''}`} key={g.key}>
              <div className="ribbon" />
              <span className="gift-big-ic">
                <Icon name={done ? 'check' : g.icon} />
              </span>
              <div className="gift-body">
                <span className="tag-line">🎁 四週年限定</span>
                <b>{g.title}</b>
                <small>{done && at ? `兌換於 ${fullDateTime(at)}` : g.desc}</small>
              </div>
              {done ? (
                <span className="pill">已兌換</span>
              ) : (
                <button className="btn btn-primary sm" onClick={() => openSheet(<GiftSheet gift={g} />)}>
                  兌換
                </button>
              )}
            </div>
          )
        })}
      </div>
    </Page>
  )
}
