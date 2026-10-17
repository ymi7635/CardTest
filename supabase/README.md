# 連接 Supabase

這個資料夾是整個資料庫：

| 檔案 | 用途 | 什麼時候執行 |
|---|---|---|
| `schema.sql` | 建立資料表、規則、權限、函式 | 每個 Supabase 專案**一開始執行一次**（可重複執行，不會刪資料） |
| `tokens.sql` | 產生她和後台的「通行碼」 | `schema.sql` 之後執行一次；弄丟了或想換連結就再執行 |
| `reset.sql` | 清空全部資料、回到從沒人用過 | 只在**測試用專案**，測完要重來時執行 |

## 先決定：兩個專案

Supabase 免費方案可以開 2 個專案，建議：

- **測試專案**：給朋友隨便玩。資料弄亂了就執行 `reset.sql`。
- **正式專案**：只給她用，從頭到尾乾乾淨淨，**不需要也不要**執行 `reset.sql`。

兩個專案都照下面的步驟 1～5 各做一次，拿到的網址、金鑰、通行碼都不一樣。

---

## 步驟 1：建立專案

1. 到 https://supabase.com 註冊／登入（可以用 GitHub 或 Google）。
2. **New project**：
   - Name：隨意，例如 `anniv-test`、`anniv-prod`
   - Database Password：設一組密碼並存好（之後幾乎用不到）
   - Region：選離你們近的，例如 **Northeast Asia (Tokyo)** 或 **Southeast Asia (Singapore)**
   - Plan：Free
3. 等 1～2 分鐘建立完成。

## 步驟 2：建立資料表與函式

1. 左邊選單 **SQL Editor** → **New query**。
2. 把 [`schema.sql`](./schema.sql) **整份**複製貼上 → 按 **Run**。
3. 下方出現 `Success. No rows returned` 就對了。

> 想確認有沒有建好：左邊 **Database → Functions**，應該看得到 `card_state`、`card_spend`、`admin_topup` 等 10 個函式。
> 資料表在私有的 `app` schema，**不會**出現在 Table Editor 的預設畫面，這是正常的（就是要讓 API 碰不到它）。

## 步驟 3：產生通行碼

1. 再開一個 **New query**，貼上 [`tokens.sql`](./tokens.sql) → **Run**。
2. 下方 Results 會出現兩個 64 字元的碼：

   | 欄位 | 用在哪裡 |
   |---|---|
   | `card_token` | 她的連結 |
   | `admin_token` | 後台連結 |

3. **立刻複製存好**。資料庫只保存雜湊，這兩個碼只會顯示這一次；弄丟了就重新執行 `tokens.sql`（舊的立刻失效）。

## 步驟 4：拿到網址和金鑰

**Project Settings → API**（新版介面也可能在 **Connect**）：

| 要的東西 | 長相 | 放哪 |
|---|---|---|
| Project URL | `https://xxxxxxxx.supabase.co` | `VITE_SUPABASE_URL` |
| `anon` public key（新版叫 publishable key） | 很長的一串，`eyJ…` 或 `sb_publishable_…` | `VITE_SUPABASE_ANON_KEY` |

> ⚠ **不要用 `service_role`（或 secret）金鑰**，那個擁有完整權限，不能出現在前端、不能傳給任何人。
> `anon` 金鑰本來就是公開的（會被打包進網頁），沒有通行碼它什麼都做不了。

同一頁確認 **Exposed schemas**（Data API 設定）只有預設的 `public`、**沒有 `app`**。

## 步驟 5：設定前端

在專案根目錄建立設定檔（範本是 `.env.example`）：

```
.env.staging       ← 測試專案的網址與金鑰
.env.production    ← 正式專案的網址與金鑰
```

內容：

```
VITE_API_MODE=supabase
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## 步驟 6：試試看

```
npm run dev:staging
```

- 她的畫面：`http://localhost:5173/?k=<card_token>`
- 後台：`http://localhost:5173/admin.html?k=<admin_token>`

第一次打開會把通行碼記在瀏覽器裡，之後網址不用再帶 `?k=`。
手機要用的話，電腦和手機連同一個 Wi-Fi，用終端機顯示的 `Network:` 網址開，記得後面接上 `?k=…`。

### 不用開網頁，直接檢查資料庫有沒有通

（把 `URL`、`KEY`、`TOKEN` 換成你的）

```
curl -X POST "URL/rest/v1/rpc/card_state" -H "apikey: KEY" -H "Content-Type: application/json" -d "{\"p_token\":\"TOKEN\"}"
```

- 回傳一包 JSON，裡面有 `"activated":false` → 成功
- 回傳 `{"message":"INVALID_TOKEN"...}` → 通行碼不對
- 回傳 `Could not find the function` → 步驟 2 沒有執行成功

## 步驟 7：上線

```
npm run build:staging   → 用測試專案打包（給朋友測試）
npm run build           → 用正式專案打包（給她用）
```

把 `dist/` 放到靜態空間（Cloudflare Pages、Netlify、Vercel…）。連結：

- 她：`https://你的網站/?k=<card_token>`
- 後台：`https://你的網站/admin.html?k=<admin_token>`

> `npm run build` 如果沒有 `.env.production`，網站會顯示「目前無法連線」並在 console 說明原因，
> 這是刻意的：避免正式版不小心用瀏覽器的模擬資料。

---

## 常見狀況

| 畫面 | 原因 |
|---|---|
| 「連結無效」 | 網址的 `?k=` 少了、貼錯，或通行碼已被換掉 |
| 「目前無法連線」 | 網址／金鑰填錯、沒有網路，或 **Supabase 專案被暫停**（見下） |
| 「目前離線」（黃色提示列） | 暫時連不上，畫面顯示的是上次的資料，連上後自動恢復 |
| 後台說「她還沒有開卡」 | 正常，等她完成開卡問答 |

### 免費專案會被暫停

Supabase 免費專案**約一週沒有任何操作**就會被暫停，網站會連不上。
到 Dashboard 按 **Restore** 就能恢復（資料還在，但要在保留期限內）。
這種低頻率使用的情境建議：偶爾打開後台看一下，或另外設定每週自動呼叫一次的排程。

## 重置與換通行碼（reset.sql）

[`reset.sql`](./reset.sql) 整份貼到 SQL Editor 執行，**預設只會執行選項 A**；要用別的選項，把選項 A 那一行用 `--` 註解掉，再把想用的選項前面的 `--` 拿掉。一次只啟用一個。

| 選項 | 做什麼 | 清空資料 | 她的通行碼 | 後台通行碼 |
|---|---|---|---|---|
| **A** 重置卡片（預設） | `select app.reset_card();` | 是 | 換新 | 不變 |
| **B** 完整重置 | `select * from app.reset_all();` | 是 | 換新 | 換新 |
| **C** 只換後台通行碼 | `select app.rotate_admin_token();` | 否 | 不變 | 換新 |
| **D** 整套砍掉重建 | 刪除函式與 `app` schema，再依序重跑 `schema.sql`、`tokens.sql` | 是 | 換新 | 換新 |

- 執行後 Results 會顯示新的通行碼，**只會顯示一次**，請立刻複製存好。
- 重置前想保留資料，先到後台「明細」按「匯出」。
- **只限測試專案**；給她正式使用的專案請不要執行會清空資料的選項（A、B、D）。
- 選項 B、C 使用的函式是後來新增的：如果資料庫是更早建立的，請先把最新的 `schema.sql` 整份貼上執行一次（可重複執行，不會刪資料）。

## 這份資料庫做了哪些保護

- 資料表都在私有 schema，前端只能呼叫那 10 個函式；每個函式都要通行碼。
- 通行碼只存雜湊；她的碼進不了後台函式。
- 流水帳只能新增，不能改、不能刪（連打開 SQL Editor 手誤 `update` 都會被擋）。
- 餘額不能為負、同一筆操作重送不會重複扣款、禮物限兌換一次、紀念日加值每年只發一次，全部由資料庫保證。
- 時間一律用資料庫的時鐘（台北時間），改手機日期沒有用。
- 這些規則都有自動測試（`npm test`）：同一組測試同時跑在「本機模擬」和「真正執行 schema.sql 的 Postgres」上，確保兩邊行為一致。
