# 四週年紀念卡

一張線上的「專屬紀念卡」：她用手機打開網址，有一張可以翻面的卡片、一筆額度（NT$）可以消費、還有兩份四週年禮物可以兌換。
他用另一個網址（後台）替她儲值、查看消費紀錄。

React 19 + Vite + TypeScript + GSAP，資料庫用 Supabase（Postgres）。**沒有自己架的後端伺服器**：網站是純靜態檔案，帳務規則都在資料庫函式裡。

| 頁面 | 入口 | 程式 | 用途 |
|---|---|---|---|
| 她的卡片 | `index.html` | `src/card` | 開卡問答、開卡儀式、首頁／明細／禮物／卡片、新增消費 |
| 後台 | `admin.html` | `src/admin` | 總覽、儲值、明細（沖銷、匯出 CSV） |

## 快速開始

```
npm install
npm run dev        # 本機模擬，不需要任何設定
```

打開 `http://localhost:5173/`（她）和 `http://localhost:5173/admin.html`（後台）。

| 指令 | 說明 |
|---|---|
| `npm run dev` | 開發伺服器，資料存在瀏覽器（本機模擬） |
| `npm run dev:staging` | 開發伺服器，連到測試用 Supabase（讀 `.env.staging`） |
| `npm run build` | 型別檢查 + 打包，連正式用 Supabase（讀 `.env.production`） |
| `npm run build:staging` | 打包，連測試用 Supabase |
| `npm test` | 全部測試 |
| `npm run typecheck` | 只做型別檢查 |
| `npm run format` / `format:check` | 用 Prettier 統一格式 / 檢查格式 |

## 資料來源有兩種

| 模式 | 什麼時候 | 說明 |
|---|---|---|
| 本機模擬（預設） | `npm run dev` | 資料存在瀏覽器 localStorage，她的頁面與後台在同一個瀏覽器裡共用；不需要設定 |
| Supabase | `npm run dev:staging`、`npm run build` | 資料存在雲端資料庫，步驟請看 [supabase/README.md](supabase/README.md) |

本機模擬的小工具（只在開發模式，打包後不存在）：

- 通行碼：不帶 `?k=` 視為示範用；帶了就必須是 `?k=demo-card`（她）或 `?k=demo-admin`（後台），否則顯示「連結無效」
- 網址加 `?now=2026-11-16`：假裝現在是那一天（測紀念日自動加值）
- 瀏覽器 console：`__mock.reset()` 清空資料、`__mock.setOffline(true)` 模擬斷線

## 架構

```
畫面（React）  ──→  CardApi / AdminApi（介面）  ──→  本機模擬（mock.ts）
                                              └──→  Supabase（supabase.ts → supabase/schema.sql 的函式）
```

- **畫面不知道資料從哪來**，只呼叫 `shared/api/types.ts` 定義的介面；換資料來源不用改畫面。
- **資料以伺服器為準**：餘額 = 流水帳（`transactions`）金額加總；畫面只是顯示，並用 localStorage 當快取（離線時還看得到上次的畫面）。
- **帳務規則只有一份答案**：`src/shared/domain/rules.ts`（前端）與 `supabase/schema.sql`（資料庫）必須做出一樣的判斷，
  由「契約測試」同時跑在兩邊來保證（見下面「測試」）。
- **通行碼取代登入**：網址的 `?k=…` 就是通行碼，資料庫只存雜湊；她的碼進不了後台。

## 資料夾

```
src/
  card/                 她的網站
    quiz/               開卡問答（useQuizState = 規則；QuizField = 單題畫面；Quiz = 主畫面與動畫）
    pages/              首頁、明細、禮物、卡片
    sheets/             底部面板：新增消費、兌換禮物、修改資料、鎖定提示
    Ceremony.tsx        開卡儀式（信封動畫）
    Shell.tsx           上方問候列 + 分頁切換 + 下方導覽列
    data.tsx            資料來源（Provider）與她能做的操作
  admin/                後台（結構同上）
  shared/
    domain/             與畫面無關的東西：設定、帳務規則、日期（台北時間）、格式、CSV
    api/                介面（types）、本機模擬（mock）、Supabase（supabase）、契約測試（contract）
    hooks/              資料同步（快取、輪詢、離線）、面板送出流程、數字動畫
    ui/                 共用元件：卡片、導覽列、面板、明細列、各種小元件
    styles/             樣式（依畫面區塊分檔）
supabase/               資料庫腳本與連線說明
```

## 想改什麼 → 去哪裡改

| 想改 | 位置 |
|---|---|
| 姓名、日期、初始額度、紀念日加值金額、CVV、卡背的話、問答內容、禮物清單 | `src/shared/domain/config.ts`（**金額與禮物同時要改 `supabase/schema.sql` 開頭的設定**） |
| 帳務規則（金額範圍、沖銷限制…） | `src/shared/domain/rules.ts` **和** `supabase/schema.sql` 的對應函式，兩邊一起改，再跑 `npm test` |
| 卡片外觀 | `src/shared/ui/card/`（正面、背面）+ `src/shared/styles/card.css` |
| 配色、字型 | `src/shared/styles/base.css` 最上面的 `:root` 變數 |
| 新增一個分頁 | 在 `Shell.tsx` 加一筆分頁設定，頁面放進 `pages/` |
| 新增一個資料庫操作 | `supabase/schema.sql` 加函式 → `api/types.ts` 加介面 → `mock.ts`、`supabase.ts` 各實作一份 → `contract.ts` 加測試 |

## 測試

```
npm test
```

- `shared/domain/*.test.ts`：帳務規則與格式（純函式）
- `shared/api/contract.ts`：**API 契約測試**，一組情境同時跑在
  - `mock.test.ts`：本機模擬
  - `supabase.test.ts`：用 PGlite（在 Node 裡跑的真正 Postgres）執行 `schema.sql`，前端的請求經由假的 fetch 送進去
- 修改規則時，先在 `contract.ts` 加測試，兩邊都綠燈才算完成。

## 程式碼慣例

- 一個檔案一個元件／一件事；元件放 `ui/`（共用）或各自的 `pages/`、`sheets/`。
- 畫面只管顯示與互動，規則放 `shared/domain`（純函式，容易測試）。
- 會「送出」的面板統一用 `useSheetAction`（防連點、顯示錯誤），錯誤文字用 `errorText` 對照，不要在每個畫面重寫一遍。
- 動畫一律用 GSAP（`useGSAP`）；CSS transition 只用在不會被 GSAP 控制的屬性（例如 `scale`）。
- 所有日期判斷用台北時間（`domain/clock.ts`），不要直接用 `new Date()` 的本地時間。
- 格式由 Prettier 管：提交前 `npm run format`。
