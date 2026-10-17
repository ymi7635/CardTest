// ───────────────────────────────────────────────
//  所有可以自己改的內容都集中在這個檔案
// ───────────────────────────────────────────────

export const HOLDER = '張雯婷' // 持卡人
export const ISSUER = '林子渝' // 發卡人
export const ANNIVERSARY = '2022-11-15' // 在一起紀念日（YYYY-MM-DD）
export const BIRTHDAY = '2003-12-19' // 持卡人生日
export const CVV = '223' // 卡背 CVV

export const INITIAL_CREDIT = 14520 // 開卡時的初始額度
export const ANNIV_TOPUP = 1115 // 每年紀念日自動加值金額
export const TOPUP_MAX = 50000 // 後台單筆儲值上限（防止多打一個 0）
export const TITLE_MAX = 20 // 消費項目名稱長度上限
export const AMOUNT_MAX = 9_999_999

export const TZ = 'Asia/Taipei' // 所有日期判斷一律用台北時間
export const POLL_MS = 15_000 // 畫面自動更新間隔

export type QuestionKey = 'name' | 'anniv' | 'birthday' | 'firstMeet' | 'favGift' | 'dessert'

export interface Question {
  key: QuestionKey
  type: 'text' | 'date'
  label: string
  en: string
  placeholder?: string
  maxLength?: number
  note?: string
  /** 日期題的正確答案（YYYY-MM-DD） */
  answer?: string
  wrong?: string
  hint?: string
}

// 開卡問答：由上往下依序解鎖，答錯時下面的欄位全部鎖住
export const QUESTIONS: Question[] = [
  {
    key: 'name',
    type: 'text',
    label: '卡面暱稱',
    en: 'NAME ON CARD',
    placeholder: '例如：NING',
    maxLength: 14,
    note: '會印在妳的專屬卡面上',
  },
  {
    key: 'anniv',
    type: 'date',
    label: '我們在一起的紀念日',
    en: 'OUR DAY',
    answer: ANNIVERSARY,
    wrong: '不對喔……這天可不能忘記 🥺',
    hint: '提示：那是一個秋天，十一月的某一天',
  },
  {
    key: 'birthday',
    type: 'date',
    label: '妳的生日',
    en: 'YOUR BIRTHDAY',
    answer: BIRTHDAY,
    wrong: '這是妳自己的生日耶 😳',
    hint: '提示：耶誕節前一個禮拜左右',
  },
  { key: 'firstMeet', type: 'text', label: '我們第一次見面在哪裡', en: 'WHERE WE MET', placeholder: '寫下那個地方', maxLength: 30 },
  { key: 'favGift', type: 'text', label: '最喜歡我送妳的什麼東西', en: 'FAVORITE GIFT', placeholder: '老實說沒關係', maxLength: 30 },
  { key: 'dessert', type: 'text', label: '最喜歡的甜點', en: 'FAVORITE DESSERT', placeholder: '例如：提拉米蘇', maxLength: 20 },
]

/** 開卡後會存進資料庫、之後可以修改的欄位 */
export type ProfileKey = 'name' | 'firstMeet' | 'favGift' | 'dessert'
export const PROFILE_FIELDS = QUESTIONS.filter((q): q is Question & { key: ProfileKey } => q.type === 'text')

// 卡片背面的話
export const BACK_MESSAGE = {
  title: 'Happy 4th Anniversary',
  zh: ['謝謝妳，陪我走過 1,461 個日子。', '往後的每一天，也想一直牽著妳的手 ♡'],
  en: 'Four years of loving you, and a lifetime still to go.',
}

// 四週年禮物：不扣額度、每項限兌換一次（兌換後會在明細留下一筆金額 0 的紀錄，後台看得到）
export interface Gift {
  key: string
  icon: 'gift' | 'pen'
  title: string
  desc: string
}

export const GIFTS: Gift[] = [
  { key: 'anniv4-gift', icon: 'gift', title: '四週年禮物', desc: '四週年專屬驚喜禮物，拆開那天揭曉' },
  { key: 'anniv4-letter', icon: 'pen', title: '四週年手寫卡片', desc: '親手寫下四年來最想對妳說的話' },
]
