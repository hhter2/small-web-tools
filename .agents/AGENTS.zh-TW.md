# AGENTS.md — small-web-tools 的 Agent 指引與樣式遷移狀態

> 本檔案說明 AI agent 在此儲存庫中應遵循的行為。
> 同時記錄 Tailwind CSS 樣式遷移狀態。
> 工程規則請閱讀 CONTRIBUTING.zh-TW.md；正式架構、路由、執行環境拓撲與專案結構
> 請閱讀 ARCHITECTURE.zh-TW.md。
> 除非使用者明確要求，否則不要修改本檔案。

<p align="center">
  <a href="AGENTS.md">English</a>
  &nbsp;·&nbsp;
  <a href="AGENTS.zh-TW.md">繁體中文</a>
</p>

---

## 1. 方向確認（每項任務前閱讀）

1. 閱讀 ARCHITECTURE.zh-TW.md 取得完整專案地圖；不要從頭掃描整個程式碼庫。
2. 使用 ARCHITECTURE.zh-TW.md 的路由清單與專案地圖，找出與目前任務相關的檔案。
3. 只讀取這些檔案。除非相依性迫使你讀取，否則不要開啟明確範圍以外的檔案。
4. 進行任何變更前，先說明預計讀取與修改的檔案。

---

## 2. 範圍規則

- 只處理與任務直接相關的檔案。若任務是新增工具，不要重構無關元件。
- 絕不重構、重新命名或重組不屬於目前任務的程式碼。
- 未經使用者明確同意，絕不安裝新的 npm 套件；先提出套件名稱與理由。
- 絕不直接修改 package-lock.json；它是自動產生的檔案。
- 絕不編輯 dist/；它是建置產物。
- 如果不確定檔案是否在範圍內，讀取前先詢問。

---

## 3. 新增工具（必要清單）

依照以下順序：

1. 在 src/components/ 下建立路由元件，並為任何非平凡的領域邏輯加入聚焦測試。
   若有支援模組，可以只使用單一 src/components/&lt;ToolName&gt;.jsx，或建立工具專用
   子目錄。
2. 在唯一的路由中繼資料來源 src/toolRegistry.js 中加入或更新一筆定義。提供每個
   ToolRoute 欄位：
   - 使用 tool-&lt;kebab-case&gt; 慣例的唯一 canonical id，以及任何向後相容 aliases；
   - title、tooltip、category、description、searchMetadata 與 subGroup；
   - iconKey；
   - 例如 () => import('./components/&lt;ToolName&gt;.jsx') 的動態 loader；登錄表會以
     React.lazy() 包裝此 loader；
   - componentProps、staticLayout 與 navigationVisible。
3. 對 navigationVisible: true 的目錄工具，在 src/toolIcons.jsx 中登錄相符
   iconKey 的 SVG 或 icon 元件。不要使用 emoji，也不要在小型導覽圖示後加背景。
4. 不要在 src/App.jsx 加入路由匯入或路由選擇邏輯。NAVIGATION_ROUTES、
   PUBLIC_ROUTE_IDS 與 STATIC_LAYOUT_IDS 都從登錄表衍生，renderActiveTool() 以
   getToolRoute() 解析路由。
5. 實作共用工具頁面契約：使用 variant="tool" 的 Card、恰好一個 ToolHeader，
   並重用 src/components/ui/ 中的 Tailwind utilities、theme tokens 與 primitives。
   只有既有 utilities 無法清楚表達共用行為或元件樣式時，才加入 src/styles.css 規則。
6. 如果瀏覽器端程式不足，在 functions/api/ 下新增 Cloudflare Pages Function，並在
   functions/_shared/ 下放置可重用的政策程式碼。Vite 目前只模擬 /api/iplookup；
   只有新端點確實需要 Vite 開發模擬時才加入中介軟體。所有新的伺服器或第三方資料流
   都必須在 config/network-services.json 與 PRIVACY.zh-TW.md 宣告。
7. 更新 ARCHITECTURE.md 與 ARCHITECTURE.zh-TW.md：將路由加入 Route Inventory，
   並更新 Repository Map 及受影響的 API／執行環境段落。只有任務允許時才更新其他
   使用者文件。
8. 執行 npm run verify。確認 canonical path 與每個 alias 都能解析、lazy 元件能
   渲染、目錄／搜尋／圖示行為符合 navigationVisible，並在桌面與行動寬度驗證路由。

---

## 4. 架構限制

| 限制 | 規則 |
|---|---|
| 路由 | src/toolRegistry.js 是唯一的路由中繼資料來源。App.jsx 將登錄表 ID 與 aliases 同步到 canonical /home 與 /simple URL 路徑，同時保留舊版 hash 相容性，並透過 getToolRoute() 解析路由。不要加入平行路由中繼資料，也不要引入 React Router 或其他路由套件。 |
| 樣式 | 使用 Tailwind utility classes、既有 design tokens 與 src/components/ui/ 的共用 primitives。只有既有 utilities 無法清楚表達時才加入全域 CSS 或元件樣式。不要引入 CSS-in-JS。 |
| 狀態管理 | 僅使用區域 useState／useReducer。不要引入 Redux、Zustand 或其他全域狀態函式庫。 |
| API 呼叫 | 優先在瀏覽器本機處理。只有必要、受限制、適當取得同意並已在 config/network-services.json 與 PRIVACY.zh-TW.md 宣告時，才加入伺服器或直接第三方資料流。需要同源伺服器邊界時使用 functions/api/。 |
| 資料隱私 | 所有用戶端工具都必須在瀏覽器中完整處理資料。除非工具明確需要（例如 IP 查詢、網站字型擷取器），否則不得將使用者資料傳送到任何伺服器。 |
| 建置工具 | Vite 6。遵循 ARCHITECTURE.zh-TW.md 記錄的執行環境拓撲。 |

---

## 5. 程式碼風格

- **語言：** 所有 React 元件使用 JSX（.jsx），不要使用 TypeScript。
- **元件：** 只使用帶 hooks 的函式元件，不使用 class 元件。
- **命名：** 元件檔案與函式名稱使用 PascalCase（例如 MyTool.jsx）；變數與 props
  使用 camelCase。
- **工具 ID：** 使用以 tool- 開頭的 kebab-case（例如 tool-mytool）。從
  src/toolRegistry.js 衍生的 PUBLIC_ROUTE_IDS 中，canonical ID 與 aliases 必須唯一。
- **樣式：** 使用 Tailwind utility classes、theme tokens 與
  src/components/ui/ 的共用 primitives。相同控制項模式需要重用時，擴充共用 primitive。
- **不要使用 inline styles，**除非確實需要動態值。
- 保持工具所有權清楚。先建立一個路由元件，複雜度需要時才抽出工具專用 helpers
  或子元件。
- **圖示：** 依登錄表的 iconKey 在 src/toolIcons.jsx 登錄導覽圖示。使用 SVG 或
  icon 元件，不使用 emoji，也不要在小型圖示後加背景。

---

## 6. 無伺服器函式（functions/api/）

- Pages Functions 預設為同源。只有端點經審查確實需要跨來源時，才加入明確 CORS。
- Vite 只模擬 /api/iplookup；其他 Functions 使用 Cloudflare Pages 本機執行環境，
  並依 CONTRIBUTING.zh-TW.md 的說明使用專用 rate-limiter Worker。
- 驗證輸入、限制資源使用、處理錯誤時不要洩漏敏感細節；適用時重用
  functions/_shared/ 的 request-policy／safe-fetch helpers。
- Functions 執行於 Cloudflare Workers 執行環境；不要使用 Node.js 專用 API，例如
  fs、path、child_process。

---

## 7. 忽略的目錄與檔案

除非任務明確涉及，否則不要讀取或修改：

- node_modules/、dist/、coverage/、test-results/、playwright-report/ 與
  .playwright-cli/：產生的相依套件、建置、覆蓋率或測試輸出；
- .wrangler/、.wrangler-*/ 與 .tmp-*/：可丟棄的 Cloudflare 本機狀態；
- package-lock.json：自動產生的 lockfile，絕不直接編輯；
- .gitignore：只有任務改變忽略政策時才讀取或修改；
- public/：只有任務涉及靜態資產、字型或回應標頭時才讀取或修改；
- README.md：由使用者手動維護，除非明確指示，不要在一般任務中更新；
- TODO.md：由使用者手動維護，絕不要自行修改。它可能含有以 # 為前綴的 issue
  或功能描述（例如 #fix）。除非使用者明確要求細節，否則不需要讀取。

---

## 8. 回覆前

在產生任何程式碼前，確認：

- [ ] 讀取哪些檔案？（列出檔案）
- [ ] 修改或建立哪些檔案？（列出檔案）
- [ ] 是否需要新的 npm 套件？如果需要，先列出名稱並請求核准。
- [ ] 是否需要新的無伺服器函式？如果需要，是否也需要開發代理模擬？
- [ ] 是否變更 src/toolRegistry.js 的路由中繼資料？如果是，ARCHITECTURE.md、
      ARCHITECTURE.zh-TW.md 的 Route Inventory 與 Repository Map、src/toolIcons.jsx
      的相符圖示，以及相關路由測試是否同步？

---

## 9. 更新 ARCHITECTURE.md

ARCHITECTURE.md 是專案結構的唯一來源。發生以下情況時更新
ARCHITECTURE.md 與 ARCHITECTURE.zh-TW.md：

- 新增檔案或目錄；
- 檔案刪除或重新命名；
- 新增工具（Route Inventory 與 Repository Map）；
- 新增相依套件（Dependencies 表格）；
- 新增或移除無伺服器函式。

不要等到被要求；凡是改變檔案結構的任務，都包含更新架構文件。

---

## 雙語文件遷移

本專案即將轉為英文／繁體中文雙語文件。修改任何說明文件前，先確認是否存在
以 .zh-TW.md 結尾的繁中對照檔。只要文件描述的行為、結構、政策或流程改變，
就要同時更新兩種語言，並確保英文連結指向英文文件、中文連結指向中文文件。

英文檔案仍是自動化 agent 指引的權威版本；AGENTS.zh-TW.md 是提供人類閱讀的
繁中翻譯。TODO.md 刻意維持英文單一版本。部分工作可能由 AI agent 透過 GitHub
Issue 與 Pull Request 追蹤，因此不是每個 issue、PR 或已完成變更都會出現在
TODO.md。完成文件任務前，檢查 README、CONTRIBUTING、ARCHITECTURE、PRIVACY、
字型清單、測試工具說明與本 agent 指引是否需要成對更新。

---

## 10. 樣式遷移狀態（Tailwind CSS）

本節追蹤 Tailwind CSS 遷移。

### 目前狀態（Phase 6 — 完成）

- 已設定 Tailwind（tailwind.config.js），主題值對應 src/styles.css 中既有的
  CSS custom properties（:root／html[data-theme="dark"]）。色彩、圓角與陰影不重複
  定義；Tailwind 讀取相同變數。
- 共用 primitives 位於 src/components/ui/：Card、Button、FieldInput、ToolHeader、
  ToggleSwitch、Spinner、ResultDisplay。新增工具或處理既有工具時使用這些元件。
- src/styles.css 現在只包含：
  - public/fonts/ 中字型的專案自有 @font-face 宣告；
  - @tailwind base/components/utilities 指令；
  - :root 與 html[data-theme="dark"] CSS custom property 定義；
  - 全域 reset（*、html/body、body）；
  - 全域元素樣式（h1、label、textarea、input、select）；
  - 工具元件仍在使用的共用模式，例如 .btn-secondary、.tab-btn、
    .search-input-group、.iplookup-results-layout；
  - 工具專用樣式（CodonTable 的 ct-*、HomeGrid、ColorConverter 等）；
  - 捲軸樣式與剩餘的 @keyframes。

### 依工具的遷移狀態

| 工具 | 狀態 |
|---|---|
| **App.jsx（shell layout）** | **完成** |
| PasswordGenerator | 完成 |
| ColorConverter | 完成 |
| SlashesConverter | 完成 |
| CasingSwitcher | 完成 |
| WordCounter | 完成 |
| DateCounter | 完成 |
| CurrencyCounter | 完成 |
| AsciiConverter | 完成 |
| UnicodeConverter | 完成 |
| BaseConverter | 完成 |
| DnaConverter | 完成 |
| CodonTable | 完成 |
| IpLookup | 完成 |
| ImgMeta | 完成 |
| DocMeta | 完成 |
| AudioMeta | 完成 |
| VideoMeta | 完成 |
| RandomWheel | 完成 |
| TypingSpeedTest | 完成 |
| NetworkSpeedTest | 完成 |
| QrBarcodeGenerator | 完成 |
| QrBarcodeScanner | 完成 |
| WebsiteFontExtractor | 完成 |
| FolderAnalyzer | 完成 |
| MediaSeparator | 完成 |
| MediaSeparatorQueueItem | 完成 |
| MediaSeparatorWaveform | 完成 |
| MediaSeparatorFormatSelect | 完成 |
| HomeGrid | 完成 |
| BioinfoIcon | 完成 |
| DnaRnaIcon | 完成 |

### 新工作規則

- 新工具：從一開始就使用 Tailwind 與 src/components/ui/ primitives。只有既有
  utilities 無法清楚表達共用行為或元件專用樣式時，才加入 styles.css 規則。
- 因無關 bug 修正而接觸既有工具時：沒有義務遷移該工具；但若同時處理樣式，
  優先讓該元件完整遷移，而不是繼續增加舊 CSS。
- 如果缺少可重用控制項模式，擴充相關共用 primitive 的 variant 或 prop，使模式
  保持可重用。

### 尚未完成

1. Button variant="danger" 仍是 placeholder；使用前需要與
   .btn-danger-custom／.btn-danger-confirm 進行真正的 parity pass。
   在完成前，不要在任何工具元件使用 variant="danger"。
