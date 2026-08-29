# 🔥 餐飲品牌每日熱點雷達（免 API 費用版）

每天用一個按鈕，**免費**收集台灣今日公開網路搜尋資料，自動整理成一份完整的分析
Prompt。你把這份 Prompt 貼到 Claude 對話（例如 claude.ai）裡，讓 Claude 幫你做
去重、風險過濾、五維評分、品牌匹配、產生 Threads 文案；再把 Claude 的回覆貼回
網站，網站就會幫你把結果整理成漂亮的卡片，並存進歷史紀錄。

**這個版本的後端完全不會呼叫任何 Claude / LLM API，不需要 `ANTHROPIC_API_KEY`，
不會產生任何 Anthropic API 費用。** 網站只負責兩件事：① 公開網路搜尋、
② 整理成 Prompt。AI 分析這一步，是你自己手動在 Claude 對話裡完成的。

---

## 一、架構總覽（跟舊版的差異）

| | 舊版 | 這個版本 |
|---|---|---|
| 誰做搜尋 | Claude API 內建 `web_search` 工具 | 伺服器自己打 DuckDuckGo（免費、免 Key）＋選用 Brave |
| 誰做分析／評分／文案 | 伺服器直接呼叫 Anthropic API | **你自己**把 Prompt 貼到 Claude 對話視窗 |
| 需要的 API Key | `ANTHROPIC_API_KEY`（要付費） | **完全不需要**（Brave 是選用、有免費額度） |
| 一鍵完成？ | 是 | 分兩步：收集資料 → 你貼到 Claude → 貼回結果 |

### 流程

1. 按下「🔍 收集今日資料＋產生分析 Prompt」
   → 呼叫 `/api/prepare-hotspots`（伺服器端）
   → 伺服器用 **DuckDuckGo 免費搜尋**（`https://html.duckduckgo.com/html/`，不需要
     API Key）打好幾個關鍵字組合，抓回今天台灣相關的搜尋結果標題／摘要／網址
   → 如果你有填選用的 `SEARCH_API_KEY`（Brave Search），會一併補充進來
   → 把「品牌設定＋規則＋這些原始搜尋結果」組成一份完整的 Prompt 文字，回傳給前端
2. 網站顯示這份 Prompt，你按「複製」，貼到 Claude.ai 送出
3. Claude 只根據 Prompt 裡附上的原始搜尋資料做分析，回覆一份 JSON
4. 你把 Claude 的回覆整段複製，貼回網站的第二個框框，按「解析並顯示分析結果」
   → 這一步是**純前端 JavaScript 解析**，不會呼叫任何外部 API
   → 網站把結果整理成 TOP 3／今日不要蹭／每個話題卡片＋複製文案按鈕
   → 同時存進歷史紀錄（存在伺服器的 `data/history/` 資料夾），下次收集資料時
     會拿來提醒「這個話題昨天已經蹭過了」

---

## 二、安裝與啟動（本機開發）

```bash
# 1. 安裝套件
npm install

# 2.（選用）複製環境變數檔案，只有想用 Brave Search 補充搜尋才需要填
cp .env.example .env

# 3. 啟動開發伺服器
npm run dev
```

打開 http://localhost:3000 即可使用，**不需要填任何 API Key 就能跑**。

手機要在同一個 Wi-Fi 下開啟，可以用 `npm run dev -- -H 0.0.0.0`，然後用電腦的
區網 IP（例如 `http://192.168.1.5:3000`）在手機瀏覽器開啟。

---

## 三、逐步使用教學

1. 打開網站，按下 **「🔍 收集今日資料＋產生分析 Prompt」**
   - 系統會顯示幾個收集進度訊息，通常幾秒內完成（純打搜尋 API，沒有 AI 運算）
2. 完成後畫面上會出現一大段文字框，裡面是**完整的分析 Prompt**
   - 按「📋 複製 Prompt」按鈕，把整段複製起來
3. 打開 [claude.ai](https://claude.ai)（或你桌面／手機上的 Claude App），開一個新對話
   - 把剛剛複製的 Prompt 貼上，直接送出
   - 等 Claude 回覆（它會回一大段 JSON，這是正常的，Prompt 裡有要求它「只回 JSON」）
4. 把 Claude 回覆的**完整內容**整段複製起來
5. 回到網站，貼到第二個框框「② 貼上 Claude 的回覆」
6. 按下 **「② 解析並顯示分析結果」**
   - 網站會把 JSON 解析成 TOP 3、今日不要蹭、每個話題的評分卡片、可直接複製的
     Threads 文案
   - 這份結果也會自動存進「📚 歷史紀錄」，方便之後回顧、也讓下次收集資料時
     可以提醒「這個話題已經用過」

如果 Claude 回覆的內容不是預期的 JSON 格式（例如它多講了一些開場白，或格式跑掉），
網站會顯示「解析失敗」的提示，你可以請 Claude 重新只回傳 JSON，再貼一次即可。

---

## 四、關於免費／付費

- **完全不需要 `ANTHROPIC_API_KEY`**，伺服器端沒有任何程式碼會呼叫 Anthropic
  或其他 LLM API，所以不會因為使用這個網站本身而產生任何 AI API 費用。
- 你在 Claude.ai 上貼 Prompt、讓 Claude 分析，使用的是你自己的 Claude 帳號
  （不論是免費額度或訂閱），跟這個網站無關、網站也不會幫你自動呼叫。
- 搜尋資料來源預設是 **DuckDuckGo 的公開 HTML 搜尋結果頁**，完全免費、不需要
  申請任何帳號或 API Key。
- `.env` 裡的 `SEARCH_API_KEY`（Brave Search）是**完全選用**的加強選項，
  Brave Search API 本身也有免費額度（詳見 https://brave.com/search/api/ ），
  不申請、留空完全沒問題，系統會自動只用 DuckDuckGo。

---

## 五、Production Build

```bash
npm run build
npm run start
```

---

## 六、部署到 Vercel（免費方案 Hobby 就可以）

1. 把這個專案 push 到你自己的 GitHub repo
2. 到 https://vercel.com/ 用 GitHub 帳號登入，選擇 **Import Project**，選這個 repo
3. Framework 會自動偵測為 Next.js，不需要更動 build 設定
4. **不需要設定任何必填的 Environment Variable**（`SEARCH_API_KEY` 是選用的，
   要用 Brave 補充搜尋才需要加）
5. 按 **Deploy**，等待部署完成後會拿到一個 `https://your-app.vercel.app` 網址

因為完全不呼叫 LLM API，每次「收集資料」只是打幾個 HTTP 搜尋請求，執行時間很短，
在 Vercel Hobby（免費）方案的 Serverless Function 時間限制內完全沒問題
（本專案已把 `maxDuration` 設為 30 秒，遠低於免費方案的上限）。

### ⚠️ 重要限制：Vercel 上的歷史紀錄不會永久保存

歷史紀錄（「📚 歷史紀錄」功能）是用**檔案系統**存在 `data/history/` 資料夾。
這在你自己的電腦、或是自架伺服器（例如一台 VPS 常駐執行 `npm run start`）上完全
沒問題，檔案會一直留著。

但 **Vercel 這類 Serverless 平台的檔案系統是「暫時性」的**：每次重新部署、甚至
有時候閒置一段時間後，寫入的檔案就會消失，歷史紀錄可能會不見（少了歷史紀錄，
「避免重複推薦」這個提醒功能也會跟著失效，但不影響主要的收集資料＋產生 Prompt
功能）。

如果之後想在 Vercel 上long-term保存歷史紀錄，建議升級成：

- [Vercel KV](https://vercel.com/docs/storage/vercel-kv)（Redis，有免費額度，最簡單）
- [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) 或 [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
- 或任何你熟悉的資料庫（Supabase、PlanetScale 等，通常也有免費方案）

只需要把 `lib/storage.ts` 裡面的讀寫邏輯換掉，其他程式碼（API 路由、前端）都不用改，
因為讀寫都是透過 `saveReport` / `getReport` / `listHistory` 這幾個函式集中處理的。

---

## 七、如何讓手機直接開啟

- **部署到 Vercel 後**：直接用手機瀏覽器打開 `https://your-app.vercel.app` 即可，
  介面本身就是手機優先（mobile-first）設計。可以在手機瀏覽器選單選「加到主畫面」，
  就會像一個 App 一樣有獨立的圖示。
- 貼 Prompt 到 Claude、再把回覆貼回來這兩個步驟，在手機上用 App 之間切換複製貼上
  就可以完成，不需要電腦。
- **本機開發階段**：手機和電腦要在同一個 Wi-Fi，電腦執行
  `npm run dev -- -H 0.0.0.0`，手機瀏覽器輸入電腦的區網 IP + port（例如
  `http://192.168.1.5:3000`）。

---

## 八、關於資料真實性與這個版本的限制

- 每次「收集資料」都會重新打 DuckDuckGo（及選用的 Brave）搜尋，**不會使用任何
  快取的舊資料**。
- Prompt 明確要求 Claude「只根據我們提供的原始搜尋結果判斷」，不能編造來源、
  網址、或精確的討論量數字；如果原始資料不足以支撐任何一個可靠的「今日熱門」，
  Claude 應該回傳 `status: "failed"`，網站會照實顯示搜尋／分析失敗，不會生出假話題。
- **已知限制：DuckDuckGo 的 HTML 搜尋結果頁沒有官方 API，是用解析公開網頁的方式
  取得資料**。這代表：
  - 沒有使用條款保證的穩定性，如果 DuckDuckGo 改版或暫時封鎖過於頻繁的請求，
    這次的搜尋結果可能會變少甚至是空的（程式已經處理成「抓不到就回傳空陣列」，
    不會讓整個流程掛掉，但你可能會看到「原始搜尋結果 0 筆」）。
  - 沒有官方 Threads API 存取權限，搜尋到的 Threads 相關內容是透過一般網頁搜尋
    （被新聞轉載、被其他網站引用的 Threads 熱門討論）取得的。
  - 如果你想要更穩定的搜尋來源，建議申請一個 Brave Search API Key（有免費額度）
    填進 `.env` 的 `SEARCH_API_KEY`，會自動補充進搜尋結果裡，不需要改任何程式碼。
- Claude 分析這一步是你手動貼上去的，**Claude 本身如果在對話裡開了網頁搜尋功能，
  也可能會自己額外查證**——這不是這個網站控制的範圍，Prompt 裡有註明「主要根據
  提供的資料判斷，如果你自己也能上網查證可以拿來交叉驗證，但不能取代提供的資料」。

---

## 九、目前功能（這個版本）

- ✅ 一鍵免費收集今日台灣公開搜尋資料（DuckDuckGo，免 API Key）
- ✅ 選用 Brave Search 補充搜尋來源（有免費額度）
- ✅ 自動組成完整的分析 Prompt（品牌設定＋規則＋原始資料）
- ✅ 一鍵複製 Prompt，方便貼到 Claude
- ✅ 貼回 Claude 的 JSON 回覆後，前端純 JavaScript 解析、無需任何 API
- ✅ 五維評分（熱度／客群／調性／執行難易／安全度）+ 總分排序 顯示
- ✅ 三品牌自動匹配顯示（東東／魚男／任性俱樂部／三店皆宜）
- ✅ 每個話題的 Threads 文案 + 一鍵複製
- ✅ 今日 TOP 3
- ✅ 今日不要蹭（高聲量但高風險的話題）
- ✅ 「現在發不發」燈號（🟢🟡🟠🔴）
- ✅ 來源標示
- ✅ 避免重複推薦（比對最近幾天已存進歷史紀錄的話題）
- ✅ 歷史紀錄（可回看過去每天的分析結果）
- ✅ 解析失敗／資料不足時誠實顯示，不產生假資料

## 十、預留但尚未實作的功能

1. Facebook / Instagram / TikTok / Google Trends / LINE 熱點來源
2. 自動每日排程「收集資料」（例如每天 10:00，用 Vercel Cron Jobs 打
   `/api/prepare-hotspots`，但注意分析步驟仍然需要你手動貼到 Claude）
3. Email／LINE 通知
4. 自動產生搭配圖片
5. 自動發布到社群（Threads／IG API）
6. 品牌活動企劃、優惠券活動建議
7. 如果之後想完全自動化（不用手動貼），可以把 Prompt 直接接回一個 LLM API
   （不論是 Anthropic 或其他家），到時候只需要新增一個會呼叫該 API 的路由，
   目前架構（`lib/prompt.ts` 產生的內容）可以直接沿用。

---

## 十一、專案結構

```
hotspot-radar/
├── app/
│   ├── page.tsx                     # 首頁
│   ├── layout.tsx
│   ├── globals.css
│   └── api/
│       ├── prepare-hotspots/route.ts    # 免費搜尋 + 產生 Prompt（無 LLM 呼叫）
│       ├── save-report/route.ts         # 儲存前端解析好的報告
│       └── history/
│           ├── route.ts                 # 歷史列表
│           └── [date]/route.ts          # 單日歷史紀錄
├── components/
│   ├── HotspotRadar.tsx             # 主畫面（兩步驟流程、貼上/貼回、結果顯示）
│   ├── TopicCard.tsx                # 單一話題卡片
│   ├── Top3Panel.tsx                # 今日 TOP 3
│   ├── NoGoPanel.tsx                # 今日不要蹭
│   ├── HistoryPanel.tsx             # 歷史紀錄側欄
│   └── CopyButton.tsx               # 複製文字按鈕（Prompt／文案共用）
├── lib/
│   ├── types.ts                     # 共用型別
│   ├── brands.ts                    # 三品牌定位與語氣範例
│   ├── prompt.ts                    # 組出可複製貼上的分析 Prompt（不呼叫 LLM）
│   ├── search.ts                    # DuckDuckGo 免費搜尋 + 選用 Brave 補充
│   ├── parseReport.ts               # 純前端解析 Claude 貼回內容（不呼叫 LLM）
│   └── storage.ts                   # 檔案式歷史紀錄存取
├── data/history/                    # 每天的分析結果（JSON）
├── .env.example
└── README.md
```
