# 四週年紀念卡

一張線上的「專屬紀念卡」：她用手機打開網址，有一張可以翻面的卡片、一筆額度（NT$）可以消費、還有兩份四週年禮物可以兌換。
他用另一個網址（**後台**）替她儲值、查看消費紀錄。

React 19 + Vite + TypeScript + GSAP，資料庫用 Supabase（Postgres），網站放在 Vercel。**沒有自己架的後端伺服器**：網站是純靜態檔案，帳務規則都在資料庫函式裡。

| 頁面 | 網址 | 誰用 | 用途 |
|---|---|---|---|
| 她的卡片 | `https://你的網站/?k=<card_token>` | 她 | 開卡問答、開卡儀式、首頁／明細／禮物／卡片、新增消費 |
| 後台 | `https://你的網站/admin.html?k=<admin_token>` | 他 | 總覽、儲值、明細（沖銷、匯出 CSV） |

> 這份文件分兩部分：
> **第一部分「部署指南」**：完全不懂程式也能照著做，從下載專案到她的手機打開為止。
> **第二部分「給開發者」**：程式架構、資料夾說明、如何修改。

---

# 第一部分：部署指南

## 全部流程總覽

```
 ① 準備帳號          GitHub、Supabase、Vercel（都免費）
 ② 取得專案          在 GitHub 把這個專案複製（Fork）到你自己的帳號
 ③ 建立資料庫        Supabase：建立專案 → 貼上 SQL → 取得「通行碼」和「連線資料」
 ④ 部署網站          Vercel：匯入專案 → 填入連線資料 → 取得網站網址
 ⑤ 測試              用自己的手機打開兩個連結，走一遍
 ⑥ 交給她            正式環境（全新的資料庫）→ 把連結傳給她，加到手機主畫面
```

整個流程**不需要在自己的電腦安裝任何東西**（只要有瀏覽器）。只有想改卡片上的文字、照片時，才需要看「附錄 A：在自己的電腦上修改」。

### 重要觀念：先測試、再正式

- 她第一次打開連結時，會做「開卡問答」並**領取初始額度**，這一步只能做一次。
- 所以請建立**兩套**環境：
  - **測試用**：你和朋友隨便玩、隨便按。
  - **正式用**：一套全新的資料庫，只給她用，從頭到尾沒有人動過。
- 兩套的做法完全一樣（步驟 ③、④ 做兩遍），只是各自有自己的資料庫、通行碼和網站網址。
- 如果只想建一套也可以，但測完之後要執行「重置」並換新的通行碼（見「平常維護」），多一道手續，也比較容易出錯。

### 名詞解釋

| 名詞 | 意思 |
|---|---|
| **通行碼**（token） | 一串 64 個字元的隨機碼，放在網址 `?k=` 後面，**就是進門的鑰匙**，不用登入。有兩組：`card_token`（她）、`admin_token`（後台），不能混用 |
| **Project URL** | Supabase 專案的網址，長得像 `https://xxxxxxxx.supabase.co` |
| **Publishable key** | Supabase 給網頁用的公開金鑰（`sb_publishable_…` 開頭）。可以放進網站，沒有通行碼它什麼都做不了 |
| **Secret key** | Supabase 的完整管理權限金鑰（`sb_secret_…` 開頭）。**這個專案完全用不到，不要複製到任何地方** |
| **環境變數** | 在 Vercel 填的設定值，網站打包時會讀進去，告訴網站要連到哪個資料庫 |

---

## ① 準備帳號

| 服務 | 用途 | 網址 |
|---|---|---|
| GitHub | 存放程式碼 | https://github.com |
| Supabase | 資料庫 | https://supabase.com |
| Vercel | 放網站 | https://vercel.com |

三個都用「Continue with GitHub」登入最方便，全部使用免費方案即可。

## ② 取得專案（Fork）

1. 打開這個專案在 GitHub 上的頁面，點右上角 **Fork** → **Create fork**。
2. 完成後你的帳號下會有一份自己的副本（網址是 `https://github.com/你的帳號/CardTest`）。
3. 之後的步驟都用你自己的這一份。

> **私人倉庫提醒**：`src/shared/domain/config.ts` 裡有姓名、生日、紀念日、開卡問答的答案。
> Fork 預設是公開的；如果不想讓別人看到，到你的倉庫 **Settings → General → 最下方 Danger Zone → Change visibility → Make private**。改成私人之後 Vercel 一樣能用。
>
> 如果原本的倉庫是私人的，你會看不到 Fork 按鈕，請對方把你加為協作者（Settings → Collaborators），或改用 **Code → Download ZIP** 下載後，自己建立新倉庫再上傳。

## ③ 建立資料庫（Supabase）

### 3-1　建立專案

1. 登入 Supabase，**New project**。
2. 填：
   - **Name**：測試用填 `anniv-test`；正式用填 `anniv-prod`
   - **Database Password**：設一組密碼並存好（之後幾乎用不到）
   - **Region**：選離你們近的，例如 **Northeast Asia (Tokyo)** 或 **Southeast Asia (Singapore)**
   - 方案：**Free**
3. 按 **Create new project**，等 1～2 分鐘建立完成。

### 3-2　貼上資料庫腳本

1. 左邊選單點 **SQL Editor** → **New query**。
2. 打開專案裡的 [`supabase/schema.sql`](supabase/schema.sql)，**整份複製**，貼到編輯區 → 按 **Run**。
3. 下方出現 **Success. No rows returned** 就成功了。

> 驗證：左邊 **Database → Functions** 裡，應該看得到 `card_state`、`card_spend`、`admin_topup` 等 10 個函式。
> 資料表放在私有的 `app` schema，所以在 Table Editor 預設畫面看不到，這是正常的。

### 3-3　取得兩組通行碼（card token 和 admin token）

1. 再開一個 **New query**。
2. 打開 [`supabase/tokens.sql`](supabase/tokens.sql)，整份貼上 → **Run**。
3. 下方 **Results** 會出現一列、兩欄：

   | card_token | admin_token |
   |---|---|
   | `bf6a…`（64 個字元） | `8d45…`（64 個字元） |

4. **立刻把兩組都複製下來，存在安全的地方**（例如密碼管理器或只有自己看得到的筆記）。
   - 資料庫只保存它們的雜湊值，**只會顯示這一次**。
   - 弄丟了，就重新執行一次 `tokens.sql`，會得到全新的兩組，舊的立刻失效。

| 通行碼 | 給誰 | 用在哪 |
|---|---|---|
| `card_token` | **她** | `https://你的網站/?k=<card_token>` |
| `admin_token` | **他（你）** | `https://你的網站/admin.html?k=<admin_token>` |

### 3-4　取得連線資料（Project URL 和 Publishable key）

1. 左邊選單最下面 **Project Settings**（齒輪）→ **API**（新版介面可能叫 **API Keys** 或 **Data API**）。
2. 記下兩樣東西：

   | 項目 | 長相 | 在哪裡 |
   |---|---|---|
   | **Project URL** | `https://xxxxxxxx.supabase.co` | API 頁面最上方 |
   | **Publishable key** | `sb_publishable_…` | API Keys 頁面的 *Publishable key* 區塊（舊版介面叫 `anon` / `public` key） |

3. ⚠ **不要複製 Secret key**（`sb_secret_…`，或舊版的 `service_role`）。它擁有完整權限，這個專案用不到，也不能出現在 Vercel、GitHub、聊天紀錄任何地方。

> 如果 Secret key 不小心貼到不該貼的地方，到 Project Settings → API Keys 把它刪除或重新產生。

## ④ 部署網站（Vercel）

### 4-1　匯入專案

1. 登入 Vercel，**Add New… → Project**。
2. 在清單找到你剛剛 Fork 的 `CardTest` → **Import**。
   - 看不到的話，按 **Adjust GitHub App Permissions**，授權 Vercel 存取這個倉庫。

### 4-2　設定

在 **Configure Project** 畫面：

| 設定 | 填什麼 |
|---|---|
| **Project Name** | 隨意，會變成網址的一部分，例如 `anniv-test` |
| **Framework Preset** | **Vite**（通常會自動偵測） |
| **Root Directory** | `./`（預設） |
| **Build Command** | `npm run build`（預設） |
| **Output Directory** | `dist`（預設） |

### 4-3　填入環境變數（這一步最重要）

展開 **Environment Variables**，新增這三筆（左邊是名稱，右邊是值）：

| 名稱（Key） | 值（Value） |
|---|---|
| `VITE_API_MODE` | `supabase` |
| `VITE_SUPABASE_URL` | 步驟 3-4 的 **Project URL**，例如 `https://xxxxxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | 步驟 3-4 的 **Publishable key**（`sb_publishable_…`） |

注意：

- **名稱必須一字不差**，包含大小寫與開頭的 `VITE_`，少了 `VITE_` 網站就讀不到。
- 值的前後不要有空白或引號。
- **環境（Environments）** 保持預設全選即可。
- 三筆都是公開的值，貼在 Vercel 沒問題；**絕對不要填 Secret key**。

### 4-4　部署

按 **Deploy**，等 1～2 分鐘。成功會出現網站網址，例如 `https://anniv-test.vercel.app`。

> **之後如果修改了環境變數**：必須重新部署才會生效（因為值是打包時才寫進網站的）。
> Vercel 專案 → **Deployments** → 最新一筆右邊的 **⋯** → **Redeploy**。

## ⑤ 測試

用你自己的網站網址和兩組通行碼，組出兩個連結：

| | 連結 |
|---|---|
| 她的頁面 | `https://你的網站.vercel.app/?k=你的card_token` |
| 後台 | `https://你的網站.vercel.app/admin.html?k=你的admin_token` |

建議用手機（最好是 iPhone）打開，走完這個清單：

- [ ] 打開她的連結，看到**開卡問答**
- [ ] 答對問題 → 簽署 → 看到**開卡儀式**（信封動畫）→ 進入首頁，額度 NT$14,520
- [ ] 新增一筆消費，餘額減少
- [ ] 打開後台連結，看到同樣的餘額與那筆消費
- [ ] 後台儲值一筆，回她的畫面（最多等 15 秒會自動更新）看到餘額增加
- [ ] 兌換禮物，後台總覽看得到「禮物兌換 1 / 2」
- [ ] 重新整理頁面、換一個瀏覽器開同一個連結，資料都還在

### 想看資料庫裡的資料

Supabase → **SQL Editor** → 新 query → 貼上 → Run：

```sql
-- 全部流水帳（最新的在最上面）
select created_at, kind, title, amount, note
from app.transactions
order by created_at desc;

-- 目前餘額
select app.balance() as balance;
```

`kind` 欄位：`initial` 初始額度、`spend` 消費、`topup` 儲值、`anniv` 紀念日加值、`gift` 禮物、`void` 沖銷。

### 檢查方式遇到的畫面

| 畫面 | 原因與處理 |
|---|---|
| 「連結無效」 | 網址少了 `?k=…`、通行碼貼錯（要完整 64 個字元，不能有空白）、或她和後台的碼用反了 |
| 「目前無法連線」 | Vercel 的環境變數沒填或填錯（回 4-3 檢查，改完要 Redeploy），或 Supabase 專案被暫停 |
| 後台說「她還沒有開卡」 | 正常，等她完成開卡問答後就會出現資料 |
| 黃色提示列「目前離線」 | 暫時連不上，畫面顯示的是上次的資料，連上後自動恢復 |

> 只打開網站首頁（沒有 `?k=`）看到「連結無效」是**正常的**，不是壞掉。

## ⑥ 交給她（正式上線）

測試都沒問題後：

1. **建立正式環境**：重做步驟 ③、④ 一遍，用**全新的** Supabase 專案（`anniv-prod`）和**新的** Vercel 專案。
   - 這樣會得到一組全新的 `card_token`、`admin_token` 和新的網站網址。
   - 正式專案**絕對不要**執行 `reset.sql`。
2. **用自己的手機確認一次正式後台能開**（打開後台連結，應該顯示「她還沒有開卡」）。
   - ⚠ **不要用她的連結去試**。只要有人先完成開卡問答，她就領不到「第一次」的儀式了。
3. 把**她的連結**（`https://正式網站/?k=正式card_token`）傳給她。
4. 自己保管好後台連結（`admin_token`）。

### 在她的 iPhone 上加到主畫面

1. 用 **Safari** 打開她的連結（網址要完整，帶著 `?k=…`）。
2. 點下方的 **分享** 按鈕 → **加入主畫面** → **加入**。
3. 之後從主畫面圖示打開，會直接進入她的卡片，不用再輸入網址。

> 一定要在網址「還帶著 `?k=…`」的時候加入主畫面，這樣圖示才會記住通行碼。
> 她第一次打開會先做開卡問答，答對之後就會看到信封開啟的儀式。

她可以做的事：消費、兌換兩份禮物、鎖定／解鎖卡片、查看明細、修改暱稱。
每年 **11/15** 資料庫會自動加值 NT$1,115（她那天沒開也沒關係，下次打開時自動補上）。

---

## 平常維護

| 想做什麼 | 怎麼做 |
|---|---|
| 替她儲值 | 後台 → **儲值**，填金額和備註 |
| 更正輸錯的紀錄 | 後台 → **明細** → 該筆右側的 **沖銷**（紀錄不會被刪除，會新增一筆反向紀錄） |
| 備份資料 | 後台 → **明細** 最下方 → **匯出**（CSV，可用 Excel 打開）。建議定期做 |
| 連結外流、或想換通行碼 | Supabase SQL Editor 執行 `select * from app.rotate_tokens();`，得到兩組新的，舊的立刻失效，再把新連結傳給對方 |
| 只換她的通行碼 | 執行 `select app.rotate_card_token();` |
| 測試完要重來（**只限測試專案**） | 貼上 [`supabase/reset.sql`](supabase/reset.sql) → Run：清空全部資料、卡片回到尚未開卡，並產生她的新通行碼 |
| 網站打不開、顯示無法連線 | Supabase 免費專案**閒置約一週會被暫停**。到 Supabase Dashboard 按 **Restore** 即可恢復（資料還在）。偶爾打開後台看一下可以避免 |
| 更新網站內容 | 在 GitHub 修改檔案並提交，Vercel 會**自動重新部署**（約 1 分鐘） |

## 安全須知

- **通行碼就是鑰匙**：拿到連結的人就能用，請只傳給對的人，不要貼在公開的地方。
- **Secret key 絕對不要用**，也不要貼給任何人、不要放進 GitHub 或 Vercel。
- 倉庫建議設成**私人**（見步驟 ②）。
- 資料庫的流水帳**只能新增、不能修改或刪除**，餘額由資料庫計算，改網頁程式也無法讓餘額變多。
- 通行碼只存雜湊值，連資料庫管理員都看不到原文，所以弄丟只能重新產生。

---

## 附錄 A：在自己的電腦上修改（選擇性）

只有想改**卡片上的文字、姓名、照片、金額**或幫忙開發時才需要。

### 安裝（只需一次）

1. **Node.js**（版本 22.12 以上）：https://nodejs.org 下載 LTS 版安裝。
2. **Git**：https://git-scm.com 下載安裝。
3. 建議的編輯器：**VS Code**（https://code.visualstudio.com）。

### 取得並執行

打開終端機（Windows 可用 PowerShell）：

```
git clone https://github.com/你的帳號/CardTest.git
cd CardTest
npm install
npm run dev
```

用瀏覽器打開 `http://localhost:5173/`（她）和 `http://localhost:5173/admin.html`（後台）。
`npm run dev` 是「本機模擬」，資料只存在這個瀏覽器，**不需要 Supabase**，適合先看看畫面。

### 連到自己的 Supabase 測試

1. 在專案根目錄建立檔案 `.env.staging`（參考 `.env.example`）：
   ```
   VITE_API_MODE=supabase
   VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_…
   ```
2. 執行 `npm run dev:staging`，打開：
   - `http://localhost:5173/?k=你的card_token`
   - `http://localhost:5173/admin.html?k=你的admin_token`

   開發伺服器要保持執行，關掉終端機網頁就打不開。

> `.env.staging`、`.env.production` 已經在 `.gitignore` 裡，不會被上傳到 GitHub。

### 常見修改

| 想改 | 位置 |
|---|---|
| 姓名（持卡人、發卡人）、生日、紀念日、CVV、卡背的話、開卡問答、禮物清單 | `src/shared/domain/config.ts` |
| 初始額度、每年紀念日加值金額、儲值上限 | `src/shared/domain/config.ts` **和**資料庫的設定（全新資料庫改 `supabase/schema.sql` 開頭；已經建好的資料庫用 `update app.settings …`，見下方說明），兩邊要一致 |
| 卡片上的狗狗照片 | 換掉 `src/assets/dog2.jpg`（維持相近的比例，約 3:2 橫式） |
| 加到手機主畫面時的圖示 | 換掉 `public/apple-touch-icon.png`（180×180） |

改完之後：

```
git add .
git commit -m "說明改了什麼"
git push
```

Vercel 會自動重新部署。

> **改了金額**（初始額度、紀念日加值、儲值上限）：資料庫裡已經存著舊的數字，重新貼 `schema.sql` 不會覆蓋它，要在 Supabase 的 SQL Editor 另外執行，例如：
>
> ```sql
> update app.settings set initial_credit = 20000, anniv_topup = 1500, topup_max = 50000;
> ```
>
> 已經開過卡的人，初始額度不會回頭更改，只有之後的紀念日加值與儲值上限會用新數字。
>
> **改了帳務規則**（不只是金額）：先在本機執行 `npm test` 確認全部通過，再到 SQL Editor 重新貼上 `schema.sql` 執行（只會更新函式，不會刪資料）。

---

# 第二部分：給開發者

## 快速開始

```
npm install
npm run dev        # 本機模擬，不需要任何設定
```

| 指令 | 說明 |
|---|---|
| `npm run dev` | 開發伺服器，資料存在瀏覽器（本機模擬） |
| `npm run dev:staging` | 開發伺服器，連到測試用 Supabase（讀 `.env.staging`） |
| `npm run build` | 型別檢查 + 打包，連正式用 Supabase（讀 `.env.production` 或 Vercel 的環境變數） |
| `npm run build:staging` | 打包，連測試用 Supabase |
| `npm test` | 全部測試 |
| `npm run typecheck` | 只做型別檢查 |
| `npm run format` / `format:check` | 用 Prettier 統一格式 / 檢查格式 |

## 資料來源有兩種

| 模式 | 什麼時候 | 說明 |
|---|---|---|
| 本機模擬（預設） | `npm run dev` | 資料存在瀏覽器 localStorage，她的頁面與後台在同一個瀏覽器裡共用；不需要設定 |
| Supabase | `npm run dev:staging`、Vercel 部署 | 資料存在雲端資料庫，步驟見第一部分與 [supabase/README.md](supabase/README.md) |

本機模擬的小工具（只在開發模式，打包後不存在）：

- 通行碼：不帶 `?k=` 視為示範用；帶了就必須是 `?k=demo-card`（她）或 `?k=demo-admin`（後台），否則顯示「連結無效」
- 網址加 `?now=2026-11-16`：假裝現在是那一天（測紀念日自動加值）
- 瀏覽器 console：`__mock.reset()` 清空資料、`__mock.setOffline(true)` 模擬斷線

> 正式版（`npm run build`）如果沒有設定環境變數，會刻意顯示「目前無法連線」，避免不小心用瀏覽器的模擬資料。

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
supabase/               資料庫腳本（schema.sql、tokens.sql、reset.sql）與連線說明
```

## 想改什麼 → 去哪裡改

| 想改 | 位置 |
|---|---|
| 姓名、日期、初始額度、紀念日加值金額、CVV、卡背的話、問答內容、禮物清單 | `src/shared/domain/config.ts`（**金額要同步改資料庫的 `app.settings`；禮物清單要同步改資料庫的 `app.gifts`**） |
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
