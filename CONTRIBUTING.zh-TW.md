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

## 文件與提交

- 發生結構、路由、API、相依套件或執行環境變更時，更新 ARCHITECTURE.md 與
  ARCHITECTURE.zh-TW.md。
- 發生使用者可見行為或資料流變更時，更新 README.md／README.zh-TW.md 與
  PRIVACY.md／PRIVACY.zh-TW.md。
- `TODO.md` 的待辦優先順序與狀態由專案擁有者控制；它刻意只提供英文版本。
  AI agent 僅可在 GitHub Issue 已關閉，且實作、驗證與提交均完成後，依既有日期、
  核取方塊與標籤格式，將完成的 Issue 補登至 `Completed`。除非另有明確要求，
  不得變更 active backlog、既有紀錄、標籤或更新流程。
- 各階段提交一致的變更。不要包含產生檔、秘密或無關的工作樹變更。
