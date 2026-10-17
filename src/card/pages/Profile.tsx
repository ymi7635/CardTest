import { ANNIVERSARY, BIRTHDAY, HOLDER, ISSUER } from '../../shared/domain/config'
import { dotDate, fmt } from '../../shared/domain/format'
import { daysTogether } from '../../shared/domain/rules'
import Card from '../../shared/ui/Card'
import Icon, { type IconName } from '../../shared/ui/Icon'
import Page from '../../shared/ui/Page'
import { useUI } from '../../shared/ui/UIProvider'
import { useCardData } from '../data'
import EditProfileSheet from '../sheets/EditProfileSheet'
import { useToggleLock } from '../useToggleLock'

export default function Profile({ onReplay }: { onReplay: () => void }) {
  const { state, name, at } = useCardData()
  const { openSheet } = useUI()
  const p = state.profile

  const rows: [IconName, string, string][] = [
    ['user', '持卡人', HOLDER],
    ['star', '發卡人', ISSUER],
    ['card', '卡面暱稱', name],
    ['heart', '我們的紀念日', dotDate(ANNIVERSARY)],
    ['sparkle', '已經相愛', `${fmt(daysTogether(at))} 天`],
    ['cake', '妳的生日', dotDate(BIRTHDAY)],
    ['pin', '第一次見面', p?.firstMeet ?? ''],
    ['gift', '最喜歡的禮物', p?.favGift ?? ''],
    ['whisk', '最愛的甜點', p?.dessert ?? ''],
  ]

  const toggleLock = useToggleLock()

  return (
    <Page>
      <div className="page-head">
        <span className="eyebrow">MY CARD</span>
        <h2>卡片</h2>
      </div>

      <div className="card-stage">
        <Card name={name} locked={state.locked} float={false} />
        <p className="flip-hint">
          <Icon name="flip" /> 輕觸卡片翻面
        </p>
      </div>

      <div className="row glass">
        <span className="item-ic">
          <Icon name={state.locked ? 'lock' : 'unlock'} />
        </span>
        <div className="item-body">
          <b>卡片狀態</b>
          <small>{state.locked ? '已鎖定，暫停消費' : '正常使用中'}</small>
        </div>
        <button
          className={`switch ${state.locked ? 'on' : ''}`}
          role="switch"
          aria-checked={state.locked}
          aria-label="鎖定卡片"
          onClick={() => void toggleLock()}
        >
          <i />
        </button>
      </div>

      <div className="info glass">
        {rows.map(([ic, k, v]) => (
          <div className="info-row" key={k}>
            <Icon name={ic} />
            <span>{k}</span>
            <b>{v}</b>
          </div>
        ))}
      </div>

      <div className="actions-list stagger">
        <button className="row glass" onClick={() => openSheet(<EditProfileSheet />)}>
          <span className="item-ic">
            <Icon name="pen" />
          </span>
          <div className="item-body">
            <b>修改資料</b>
            <small>暱稱、第一次見面、最喜歡的禮物與甜點</small>
          </div>
          <Icon name="right" className="arrow" />
        </button>
        <button className="row glass" onClick={onReplay}>
          <span className="item-ic">
            <Icon name="sparkle" />
          </span>
          <div className="item-body">
            <b>重看開卡儀式</b>
            <small>再拆一次信封</small>
          </div>
          <Icon name="right" className="arrow" />
        </button>
      </div>
    </Page>
  )
}
