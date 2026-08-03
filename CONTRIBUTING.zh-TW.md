# 貢獻 Small Web Tools

<p align="center">
  <a href="CONTRIBUTING.md">English</a>
  &nbsp;·&nbsp;
  <a href="CONTRIBUTING.zh-TW.md">繁體中文</a>
</p>

CONTRIBUTING.md 是正式的工程指南。請參閱 ARCHITECTURE.zh-TW.md 了解目前的
架構、路由清單、API 拓撲與專案地圖。

## 支援環境

- 支援 Node.js 22 與 Node.js 24；.nvmrc 選取 Node 22。
- 使用 package.json 的 packageManager 欄位固定的 npm 10.9.2。CI 會拒絕其他
  npm 版本，因此還原相依套件前請先安裝：

  ```bash
  npm install --global npm@10.9.2
  npm ci
  ```

- 前端使用 React 18 與 Vite 6。
- 正式環境 API 使用 Cloudflare Pages Functions，以及
  workers/rate-limiter/ 中獨立的 rate-limiter Worker。

## 本機開發

啟動瀏覽器應用程式：

```bash
npm run dev
```

Vite 中介軟體只會模擬 /api/iplookup。若要使用真正的本機服務繫結拓撲執行
所有 Pages Function，先將 .dev.vars.example 複製為 .dev.vars，並把範例
RATE_LIMIT_HMAC_SECRET 替換為至少 32 個隨機字元。建置前端後開啟兩個終端機：

```bash
npm run build
npx wrangler dev --config workers/rate-limiter/wrangler.jsonc
```

```bash
npx wrangler pages dev
```

Wrangler 會找到名為 small-web-tools-rate-limiter 的 Worker，並連接
wrangler.jsonc 宣告的 RATE_LIMITER_SERVICE 綁定。Pages 執行環境接著會在
http://localhost:8788 提供服務。確定性的自動化檢查會在隔離的本機狀態中啟動
兩端，經由 Pages → Service Binding → Worker 傳送並行請求，並另外證明正式環境
在缺少綁定時會安全失效：

```bash
npm run platform:integration
```

常用驗證指令：

```bash
npm run build
npm run verify
npm run platform:integration
npm run test:e2e
npm run deps:check
npm run audit
```

選擇性執行的 npm run test:ssrf-runtime 會建立未認領的臨時 Cloudflare 預覽帳戶，
因此會進行外部部署。只有在需要 Cloudflare 執行環境的 CR-009 證據，且操作者
接受 Cloudflare 當前的服務條款與隱私權政策時，才可執行。指令會遮蔽 bearer 與
認領憑證；絕不要把全域 Wrangler 設定或認領 URL 貼入記錄。

npm run verify 會執行 Git 標籤版本解析、Lint 警告預算、一般與嚴格 checkJs、
覆蓋率、建置／套件大小、標頭、網路清單、Cloudflare 設定與文件一致性檢查。
CI 會在 Node 22 與 Node 24 上執行。

## 工程標準

- 使用函式式 React 元件與 hooks。路由中繼資料屬於共用工具登錄表；保留正式
  公開路徑與向後相容的別名。
- 使用 Tailwind utilities、src/styles.css 中的設計 token，以及
  src/components/ui/ 中的 primitives。保持控制項可用鍵盤操作並具有清楚的焦點狀態。
- 用戶端工具必須讓使用者內容留在瀏覽器中。只有在必要、受限制、適當取得同意，
  且已在 config/network-services.json 與 PRIVACY.zh-TW.md 宣告時，才可加入
  伺服器或第三方資料流。
- Pages Functions 必須使用 Web Platform／Cloudflare API，而不是 Node 專用 API。
  可重用的請求驗證與安全抓取邏輯放在 functions/_shared/。
- 為純函式／領域邏輯加入聚焦的單元測試，為關鍵流程加入 Playwright 覆蓋率。
  避免只依賴路由冒煙測試。

## 國際化

- `src/i18n/index.js` 負責地區設定正規化與初始解析（已儲存偏好、瀏覽器語言，最後
  才使用 `en-US`）、i18next 設定、`document.documentElement.lang` 與持久化。標頭的
  語言選單提供支援的 `en-US` 與 `zh-TW` 地區設定。
- 將使用者可見文字放在 `src/i18n/locales/<locale>/` 下有界線的 `common`、
  `navigation`、`tools` 或 `errors` 命名空間；不可使用翻譯後的標籤作為識別碼。
- 路由 ID、URL 路徑與技術識別碼必須獨立於翻譯；標籤、描述、tooltip、搜尋別名、錯誤、
  通知與輔助名稱則應進行在地化。
- 每項 UI 變更都必須加入相符且非空白的 `en-US` 與 `zh-TW` 鍵。語意鍵使用
  lower camel case，動態值使用 `{{value}}` 插值，數量使用 i18next 複數後綴。
- 兩種語言的插值變數必須一致。DNA、MIME、QR、RGB、通訊協定與副檔名等穩定
  技術詞彙，在保留原文更清楚時可以不翻譯。
- 面向讀者的數字、日期、時間與排序應使用目前語言的 `Intl`。內容演算法必須檢查
  實際內容，不可假設內容語言等同介面語言。
- 執行 `npm run i18n:check`；它會拒絕無效／重複 JSON、鍵差異、空白翻譯、
  插值變數不相容，以及明確指向不存在鍵的參照。
- 執行 `npm run i18n:audit` 以拒絕寫死的使用者可見 JSX 文字。
  `scripts/check-hardcoded-ui.mjs` 中的審核允許清單僅供語言中立的格式、單位、
  公式、字型名稱、條碼名稱與鍵盤標記使用，請維持最小範圍。

範例：在兩個語言檔加入 `feature.resetNotice`，以
`t('common:feature.resetNotice', { count })` 顯示並測試兩種語言。確認可見文字、
placeholder、通知、輔助文字與頁面標題都會更新，且路由不變。

Pull request 必須說明翻譯影響，並確認已檢查桌面版與行動版的雙語版面。

## 文件與提交

- 發生結構、路由、API、相依套件或執行環境變更時，更新 ARCHITECTURE.md 與
  ARCHITECTURE.zh-TW.md。
- 發生使用者可見行為或資料流變更時，更新 README.md／README.zh-TW.md 與
  PRIVACY.md／PRIVACY.zh-TW.md。
- 修改維護中的指南後執行 `npm run docs:check`；地區設定變更也必須同步兩棵資源樹，
  並執行 `npm run i18n:check` 與 `npm run i18n:audit`。
- `TODO.md` 的待辦優先順序與狀態由專案擁有者控制；它刻意只提供英文版本。
  AI agent 僅可在 GitHub Issue 已關閉，且實作、驗證與提交均完成後，依既有日期、
  核取方塊與標籤格式，將完成的 Issue 補登至 `Completed`。除非另有明確要求，
  不得變更 active backlog、既有紀錄、標籤或更新流程。
- 各階段提交一致的變更。不要包含產生檔、秘密或無關的工作樹變更。
