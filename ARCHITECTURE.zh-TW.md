# Small Web Tools 架構指南

<p align="center">
  <a href="ARCHITECTURE.md">English</a>
  &nbsp;·&nbsp;
  <a href="ARCHITECTURE.zh-TW.md">繁體中文</a>
</p>

`small-web-tools` 是一個以 React 18 與 Vite 建構的單頁應用程式，提供瀏覽器型工具。本文件是維護目前應用程式的技術參考；路由、共用元件、API 或相依套件變更時，請同步更新。

專案維護英文與繁體中文成對的說明文件。繁體中文對照檔使用 `.zh-TW.md` 後綴；`TODO.md` 維持英文單一版本。文件化行為或結構變更時，兩種語言版本必須同步。

## 文件角色

- `README.md` 是提供網站使用者閱讀的精簡英文手冊；`README.zh-TW.md` 是繁體中文翻譯。
- `CONTRIBUTING.md` 是貢獻標準與 AI 指引的英文來源；`CONTRIBUTING.zh-TW.md` 是繁體中文對照檔。
- `TODO.md` 是維護中的英文待辦、已完成工作紀錄與更新流程。
- `ARCHITECTURE.md` 是英文架構與維護參考；`ARCHITECTURE.zh-TW.md` 是其繁體中文對照檔。
- `PRIVACY.md` 與 `PRIVACY.zh-TW.md` 是成對的隱私權政策與資料流揭露。
- `src/i18n/` 是兩個支援 UI 地區設定及其 `common`、`navigation`、`tools`、`errors` namespace 的來源。

## 快速資訊

| 項目 | 值 |
| --- | --- |
| 套件 | `small-web-tools` |
| 版本 | 最新符合版本格式的 Git tag；沒有 Git metadata 的封存建置使用 `VITE_APP_VERSION` fallback |
| UI framework | React 18 |
| 建置工具 | Vite 6 |
| 測試 | Vitest 4 + React Testing Library + jsdom |
| Lint 與型別 | ESLint 9、JSDoc，加上一般與 strict checkJs 專案 |
| 樣式 | Tailwind CSS utilities 搭配 `src/styles.css` design tokens 與元件專用規則 |
| 路由 | 應用程式內狀態同步至 `/home` 與 `/simple` URL path，搭配 `React.lazy()` code splitting；未使用 React Router |
| 伺服器函式 | `functions/api/` 中的 Cloudflare Pages 相容 handlers，以及 `functions/_shared/` 共用 helpers |

建置時，`scripts/resolve-version.mjs` 會選出依版本排序後最新的 Git tag。它先檢查本機 tags；若部署建置沒有本機 tag refs，再查詢 repository remote tags。沒有 Git metadata 的封存建置仍可使用 `VITE_VERSION_REPOSITORY` 或 `package.json` 中的 repository URL；`VITE_APP_VERSION` 是最後的明確 fallback。npm manifest 使用固定的非 release placeholder `0.0.0-private`，不會顯示為應用程式版本，也不會在 release 時更新。CI 會 checkout 完整 tag history，而 `verify` 內的 `npm run version:check` 會確認顯示版本來自 Git tag 或明確的 archive fallback。

## Repository map

維護中的文件配對為 README.md/README.zh-TW.md、CONTRIBUTING.md/CONTRIBUTING.zh-TW.md、ARCHITECTURE.md/ARCHITECTURE.zh-TW.md，以及 PRIVACY.md/PRIVACY.zh-TW.md。TODO.md 刻意維持英文單一版本。其他說明文件包括 public/fonts/MANIFEST.md 與其繁體中文對照檔、兩份 SSRF harness README，以及 `.agents/` 中僅英文的 AI agent 指示。

```text
small-web-tools/
├── README.md                 英文使用者網站手冊
├── README.zh-TW.md           繁體中文使用者網站手冊
├── CONTRIBUTING.md           英文工程與本機執行指南
├── CONTRIBUTING.zh-TW.md     繁體中文工程指南
├── PRIVACY.md                英文隱私權政策與資料流揭露
├── PRIVACY.zh-TW.md          繁體中文隱私權政策
├── TODO.md                   待辦、已完成工作與更新流程
├── ARCHITECTURE.md           架構與維護參考
├── ARCHITECTURE.zh-TW.md     繁體中文架構參考
├── package.json              scripts、dependencies 與 pipeline commands
├── jsconfig.json             JavaScript 的 TypeScript checkJs 設定
├── eslint.config.js          React、hooks 與 Cloudflare functions 的 ESLint flat config
├── vitest.config.js          Vitest runner 設定
├── vite.config.js            Vite 6、dev proxy 與 Rollup manualChunks 設定
├── tailwind.config.js        映射 CSS custom properties 的 Tailwind tokens
├── postcss.config.js         Tailwind 與 Autoprefixer 設定
├── index.html                Vite HTML shell 與 React mount point
├── config/
│   ├── network-services.json 網路服務政策來源
│   ├── ffmpeg-assets.json    固定 FFmpeg asset size 與 SHA-256
│   └── rateLimitPolicies.js  正式 route、class、binding、limit 與 period 政策
├── scripts/
│   ├── check-i18n.mjs         locale pair 結構與 interpolation 檢查
│   ├── check-hardcoded-ui.mjs 使用者可見字串稽核
│   └── check-doc-consistency.mjs 文件／連結一致性檢查
├── .github/
│   ├── dependabot.yml        每週 dependency 更新設定
│   └── workflows/ci.yml      GitHub Actions CI pipeline
├── public/
│   ├── _headers              Cloudflare Pages security response headers
│   ├── fonts/                自託管 WOFF2 UI 字型、授權與 manifest
│   └── favicon.svg           靜態網站 icon
├── src/
│   ├── main.jsx              React mount 與全域 stylesheet import
│   ├── App.jsx               application shell composition 與 registry renderer
│   ├── toolRouteMetadata.js  canonical routes、aliases、metadata 與 layout flags
│   ├── toolRegistry.js       將 lazy component loaders 接到 canonical route metadata
│   ├── toolModes.js          audience／Simple workspace profiles、filtering 與 URL helpers
│   ├── toolIcons.jsx         依 registry icon key 呈現 route icons
│   ├── styles.css            theme tokens、全域規則、responsive 與 component styling
│   ├── i18n/
│   │   ├── index.js           locale resolution、i18next setup、persistence 與 document language
│   │   └── locales/           成對 en-US 與 zh-TW namespace JSON resources
│   ├── lib/                  純 utility helpers（passwordStrength、resourceLimits、thirdPartyServices）
│   ├── hooks/                routing、persistence 與 document-title shell effects
│   ├── tests/                Vitest unit test suites 與 setup
│   └── components/
│       ├── ui/               共用 Card、Button、FieldInput、ToolHeader 與相關 primitives
│       ├── HomeGrid.jsx      完整與 audience dashboard tool grid
│       ├── SimpleHome.jsx    search-first essential-tool launcher
│       ├── LanguageSwitcher.jsx 共用 responsive locale menu 與 focus lifecycle
│       ├── AppHeader.jsx     desktop brand、category navigation、search、locale 與 theme controls
│       ├── AppFooter.jsx     registry-driven footer navigation 與 project actions
│       ├── DesktopCategoryNav.jsx 由 registry 衍生的 pointer shortcut navigation
│       ├── MobileDrawer.jsx  mobile navigation focus、inert、dismissal 與 scroll lifecycle
│       ├── MarkdownPreviewer/ Markdown parsing 與 validation domain logic
│       ├── *.jsx             個別工具元件
│       ├── useMediaSeparator.js
│       └── mediaSeparatorEngine.js
└── functions/
    ├── _shared/              共用 serverless utilities（safeExternalFetch、requestPolicy）
    └── api/
        ├── *.js              Cloudflare Pages API handlers
        └── tests/            專用 API handler unit tests
```

`dist/` 由 `npm run build` 產生並刻意忽略。

`functions/_shared/responseHeaders.js` 是 Pages Functions 與靜態 `_headers` policy 的可執行 response baseline。`scripts/check-headers.mjs` 會拒絕 drift 並驗證 `config/csp-exceptions.json`。自訂網域檢查使用 `PRODUCTION_HOST` 與配套 production-hardening runbook。

## Type-checking boundaries

JavaScript migration 使用三個明確的 TypeScript checkJs 專案。`jsconfig.json` 是廣泛的 non-strict baseline；`jsconfig.domain.json` 保留既有狹義 domain／shared-helper boundary；`jsconfig.ui.json` 是漸進式 shared-UI boundary，對 `LanguageSwitcher`、desktop header/category/footer components、`MobileDrawer`、routing/title/persistence hooks 與其 pure route/mode dependencies 啟用 `strictNullChecks`。CI 中的 `npm run typecheck` 會執行三個專案。新增排除必須維持最少且有文件說明；擴大 UI boundary 時，必須在同一變更修正所有新暴露的錯誤。

## Application architecture

### Entry 與 shell

`src/main.jsx` mount `<App />` 並 import `src/styles.css`。

`src/App.jsx` 組合 application shell 與 registry renderer：

- `src/toolRouteMetadata.js` 是唯一 route metadata 來源。Sidebar、desktop navigation、dashboard cards、active titles、footer links、static layouts、lazy components 與 route tests 都由此衍生；`src/toolRegistry.js` 只負責把 metadata 接到 lazy component loaders。
- Registry alias 保留舊書籤；`tool-officemeta` 會解析成 `tool-docmeta`。
- `categories` 定義六個呈現群組：Text、Developer、Network、Media、Bioinfo、Utilities。
- `useAppRouting` 從 `/home[/<audience>]/<tool-slug>` 或 `/simple/<tool-slug>` 初始化 `activeTool`，並把 navigation 與 browser history 同步至 path。
- `useAppRouting` 從經驗證的 `/home` 或 `/simple` path 初始化 `toolMode`。工具切換時 workspace path 仍保留在 URL。
- `useShellPersistence` 負責 active-tool session state，以及 theme 與 sidebar persistence；`useDocumentTitle` 獨立負責 title 更新，不依賴 storage 是否可用。
- `renderActiveTool()` 解析目前 registry entry 並 render lazy component。`privacy` route 有註冊，但不出現在 tool catalog。

Shell 提供 responsive desktop sidebar、mobile drawer、top navigation、breadcrumbs、footer、search、theme control 與置中的 tool stage。`AppHeader`、`DesktopCategoryNav` 與 `AppFooter` 負責 desktop header/footer presentation，而 `App.jsx` 傳入由 registry 衍生的資料與 navigation callbacks。

`src/components/MobileDrawer.jsx` 負責窄螢幕 drawer boundary。關閉時 drawer 會 unmount；開啟時會移動並限制焦點、讓被遮蔽 shell inert、鎖定 body scrolling，支援 Escape、overlay、explicit-close 與 route dismissal，之後把 focus 還原給 opener。

`src/components/LanguageSwitcher.jsx` 由 `App.jsx` 在 mobile header render，並由 `AppHeader.jsx` 在 desktop header render。它是 locale options、menu state、keyboard navigation 與 focus restoration 的共用 owner；Simple workspace 會省略 desktop control。

### Internationalization runtime

`src/i18n/index.js` 以 `react-i18next` adapter 初始化 `i18next`，並使用 `src/i18n/locales/en-US/` 與 `src/i18n/locales/zh-TW/` 下四個成對 namespace：`common`、`navigation`、`tools`、`errors`。英文（`en-US`）是預設與 fallback locale；繁體中文（`zh-TW`）是第二個支援 locale。

初始 locale resolution 是 deterministic：有效的已持久化 `small-web-tools.locale` 優先，其次為 browser preferred languages，最後是 English。`src/components/LanguageSwitcher.jsx` 呼叫 `changeLocale()`、更新 `document.documentElement.lang`，且只持久化 normalized supported locale。Storage failure 不會阻止 in-memory language change。

Route ID、URL path、tool ID、file extension、protocol name 與其他 interoperability-sensitive identifiers 維持穩定。`toolRegistry.js` 將這些 identifier 與在地化 title、description、tooltip、search metadata 分離；英文搜尋詞仍可作為 fallback aliases。`sortLocalizedTools()` 使用目前 locale 的 `Intl.Collator`；工具使用 locale-aware `Intl` formatting 顯示數字、日期與時間。使用者內容與內容演算法不會依 UI locale 翻譯。

每次 UI string 變更都必須同時更新兩棵 locale resource tree。`npm run i18n:check` 檢查 key parity、duplicate keys、non-empty values 與 interpolation parity；`npm run i18n:audit` 掃描 JSX 是否有未審查的 user-facing literals。專用 runtime/resource tests 位於 `src/tests/i18n.test.js`、`src/tests/i18nValidation.test.js`、`src/tests/i18nHardcodedUi.test.js` 與 `src/tests/wordCounterLocale.test.js`。

### Audience 與 Simple workspaces

`src/toolModes.js` 定義完整 dashboard 與五個 audience profiles：一般使用者、開發人員、生物資訊研究人員、設計師與學生。獨立 `SIMPLE_WORKSPACE` 定義八個高頻工具。App-level filtering 會一致套用 audience profile 到 dashboard cards、sidebar 與 search；Simple sidebar 只保留 essentials，但 Simple search 可開啟任何已註冊工具。

`AudienceSwitcher.jsx` 呈現首頁的 segmented control，包含完整首頁與五個 audience profiles。`HomeGrid.jsx` 將它放在 introduction 旁，保留完整 categorized dashboard，並呈現 flat audience recommendations。`SimpleHome.jsx` 在精簡 shell 中提供 all-tool search 與八個 compact shortcuts。Routing 使用 `/home[/<audience>][/<tool-slug>]` 與 `/simple[/<tool-slug>]`；舊 `/home/simple` 位址會 redirect 到 `/simple`。專用 coverage 位於 `toolModes.test.js`、`homeGrid.test.jsx`、`audienceSwitcher.test.jsx` 與 `simpleHome.test.jsx`。

### Shared tool-page contract

每個 routed tool page 都遵循由 Image Metadata 建立的共用視覺 contract：

1. 使用 `Card` 並設 `variant="tool"` 作為 page container。
2. 每個頁面只 render 一個 `ToolHeader` title 作為 page identity。
3. 不把 page-level description 放進 `ToolHeader`；helper text 應留在需要它的 feature 內。
4. 維持共用 desktop card spacing（`p-6`、`gap-4`），並由 `styles.css` 中 mobile `.tool-card` rules 處理 compact screens。

`src/components/ui/AutoDetectConverter.jsx` 為 Slashes、ASCII、Unicode 與 URL converters 實作此 contract。Slashes 與 ASCII 只暴露 automatic direction detector；Unicode 與 URL 在方向可能有歧義時保留明確 encode/decode controls。

### Styling 與 theme

`src/styles.css` 定義 light/dark CSS custom properties，例如 `--bg-app`、`--bg-card`、`--text-main`、`--accent` 與 `--border-color`。`tailwind.config.js` 將這些 tokens 暴露為 Tailwind color、shadow 與 font utilities。

Inter、JetBrains Mono、Plus Jakarta Sans 與 TASA Orbiter 從 `public/fonts/` 提供；其版本、subset 與 OFL license files 記錄在 `public/fonts/MANIFEST.md`。應用程式不會自動請求 Google Fonts。

優先使用共用 primitives 與既有 design tokens。只有真正共用的行為，或無法清楚以既有 utilities 表達的 component-specific rules，才新增 global CSS。

## Route inventory

| Route ID | 導覽名稱 | Component | Category |
| --- | --- | --- | --- |
| `tool-home` | 儀表板 | `HomeGrid.jsx` | Dashboard |
| `tool-wc` | 文字計數器 | `WordCounter.jsx` | Text |
| `tool-casing` | 大小寫切換器 | `CasingSwitcher.jsx` | Text |
| `tool-slash` | 斜線轉換器 | `SlashesConverter.jsx` | Developer |
| `tool-ascii` | ASCII 轉換器 | `AsciiConverter.jsx` | Developer |
| `tool-unicode` | Unicode 轉換器 | `UnicodeConverter.jsx` | Developer |
| `tool-url` | URL 編碼與解碼器 | `UrlEncoderDecoder.jsx` | Developer |
| `tool-markdown` | Markdown 預覽器 | `MarkdownPreviewer.jsx` | Developer |
| `tool-mermaid` | Mermaid 轉換器 | `MermaidConverter.jsx` | Developer |
| `tool-code-preview` | VS Code 預覽器 | `CodePreviewer.jsx` | Developer |
| `tool-fontextractor` | 網站字型擷取器 | `WebsiteFontExtractor.jsx` | Developer |
| `tool-base` | 進位轉換器 | `BaseConverter.jsx` | Developer |
| `tool-folder-analyzer` | 資料夾分析器 | `FolderAnalyzer.jsx` | Developer |
| `tool-iplookup` | IP 查詢 | `IpLookup.jsx` | Network |
| `tool-speedtest` | 網路速度測試 | `NetworkSpeedTest.jsx` | Network |
| `tool-color` | 色彩轉換器 | `ColorConverter.jsx` | Media |
| `tool-imgmeta` | 圖片中繼資料 | `ImgMeta.jsx` | Media |
| `tool-docmeta` | 文件中繼資料 | `DocMeta.jsx` | Media |
| `tool-audiometa` | 音訊中繼資料 | `AudioMeta.jsx` | Media |
| `tool-videometa` | 影片中繼資料 | `VideoMeta.jsx` | Media |
| `tool-mediasplit` | 媒體分割器 | `MediaSeparator.jsx` | Media |
| `tool-svg-png` | SVG 轉 PNG | `SvgToPngConverter.jsx` | Media |
| `tool-dna` | DNA/RNA 轉換器 | `DnaConverter.jsx` | Bioinfo |
| `tool-codon` | 密碼子表 | `CodonTable.jsx` | Bioinfo |
| `tool-phred` | Phred 尺度轉換器 | `PhredScaleConverter.jsx` | Bioinfo |
| `tool-barcode` | 條碼產生器 | `QrBarcodeGenerator.jsx`（`barcode` tab） | Utilities |
| `tool-currency` | 貨幣轉換器 | `CurrencyCounter.jsx` | Utilities |
| `tool-date` | 日期與時間計算器 | `DateCounter.jsx` | Utilities |
| `tool-roman` | 羅馬數字轉換器 | `RomanNumeralConverter.jsx` | Utilities |
| `tool-password` | 密碼產生器 | `PasswordGenerator.jsx`（`generate` tab） | Utilities |
| `tool-pwstrength` | 密碼強度 | `PasswordGenerator.jsx`（`check` tab） | Utilities |
| `tool-qrcode` | QR Code 產生器 | `QrBarcodeGenerator.jsx`（`qr` tab） | Utilities |
| `tool-qrbarcodescan` | QR Code 與條碼掃描器 | `QrBarcodeScanner.jsx` | Utilities |
| `tool-wheel` | 隨機轉盤 | `RandomWheel.jsx` | Utilities |
| `privacy` | 隱私權與網路服務 | `PrivacyPolicy.jsx` | Policy（不在 tool catalog） |

## Component groups

### Shared UI：`src/components/ui/`

| File | 角色 |
| --- | --- |
| `Card.jsx` | tool pages 與 dashboard cards 的共用 card container。 |
| `ToolHeader.jsx` | routed tools 的單一 title page identity component。 |
| `Button.jsx` | 共用 button variants 與 sizes。 |
| `FieldInput.jsx` | 帶 label 的 input／textarea helper。 |
| `AutoDetectConverter.jsx` | 共用雙 panel automatic converter interface。 |
| `ToggleSwitch.jsx`, `Spinner.jsx`, `ResultDisplay.jsx` | reusable controls 與 feedback UI。 |

`ExternalMapPreview.jsx` 是 IP Lookup 與 Image Metadata 共用的 OpenStreetMap consent boundary。它會在本機 render coordinate text，只在 `osm` consent 有效時建立 iframe，並在 revoke 或 reset 後立即移除 iframe。

### Markdown Previewer

`MarkdownPreviewer.jsx` 提供 browser-local editor、`.md`/`.markdown` upload、live preview、formatting helpers 與 Markdown download。其 domain module 會把常見 block/inline syntax parse 為安全的 React-rendered tokens；raw HTML 與 external images 不會 render，unsafe URL schemes 會被丟棄。Source-line metadata 讓可獨立捲動的 editor 與 preview 雙向對齊，不會破壞 fenced-code content。專用 parser 與 interaction coverage 位於 `markdownDomain.test.js` 與 `markdownPreviewer.test.jsx`。

### VS Code Preview

`CodePreviewer.jsx` 提供一個 browser-local、VS Code 風格的 editing surface，高亮 display 與 text input 共用同一個視窗。它支援 26 種可選 language modes（含 Bash/Shell）、local file input、on-demand appearance dialog（System、Light、Dark presets）、accent/background/foreground/code font controls、line numbers、source-file download、clipboard copy 與 lazy PNG export，而且不會執行或送出 code。Language registry、filename inference、contrast selection 與 highlighting helpers 位於 `CodePreviewer/lib/`；專用 domain／interaction coverage 位於 `codePreviewDomain.test.js` 與 `codePreviewer.test.jsx`。

### Media Splitter

`MediaSeparator.jsx` 是 page component。`useMediaSeparator.js` 負責 queue state 與 actions。`mediaSeparatorEngine.js` 只在需要時下載固定的 FFmpeg 0.12.6 JavaScript 與 WebAssembly assets，依 `config/ffmpeg-assets.json` 驗證 byte length 與 SHA-256，再透過 Blob URLs 載入。Queue item、waveform 與 format-select components 讓 UI 保持 modular。

### File metadata tools

`ImgMeta.jsx`、`DocMeta.jsx`、`AudioMeta.jsx` 與 `VideoMeta.jsx` 在瀏覽器解析使用者選取檔案。它們支援各自的 inspection、comparison、export 或 metadata-removal workflows，不會把檔案送到此應用程式後端。

純 document formatting/parsing helpers 位於 `src/components/DocMeta/lib/`。QR/barcode encoding rules 與 codon input/filter/presentation rules 位於各自的 `src/components/<Tool>/lib/` 目錄。專用 coverage 包含 `documentMetadataDomain.test.js`、`qrBarcodeDomain.test.js`、`codonDomain.test.js`；DNA/RNA copy formatting coverage 位於 `dnaCopy.test.js`，time-difference coverage 位於 `timeDomain.test.js`，Roman numeral coverage 位於 `romanDomain.test.js`，Phred conversion coverage 位於 `phredDomain.test.js`，sanitized SVG parsing/export-size coverage 位於 `svgDomain.test.js`，URL percent-encoding coverage 位於 `urlDomain.test.js`。Converter-mode、folder-picker、Color Sync 與 image-stripping guidance regression 由 `converterClipboard.test.jsx` 與 `enhancementUi.test.jsx` 覆蓋。

## APIs 與 development middleware

Cloudflare Pages 相容 handlers 位於 `functions/api/`：

| Endpoint | File | 用途 |
| --- | --- | --- |
| `GET /api/iplookup?ip=<address>` | `iplookup.js` | 查詢 fallback IP geolocation providers 並 normalize response。 |
| `POST /api/extract-fonts` | `extract-fonts.js` | same-site-only、rate-limited 的 bounded public HTML/CSS scan；回傳 declaration metadata 與 truncation info，不抓 font files。 |
| `GET /api/exchange-rates` | `exchange-rates.js` | 取得 browser consent 後 fetch 並 normalize live USD-based exchange rates。 |

專用 `*.test.js` suites 位於 `functions/api/tests/`。`vitest.config.js` 將 `functions/api/**` 納入 coverage gate，threshold 與 shared server/client libraries 相同。

`functions/_shared/requestPolicy.js` 負責 Font Extractor 的 4 KiB request cap 與 aggregate job limits（HTML/CSS/total bytes、stylesheet count、import depth、face count、concurrency、deadline）。`functions/_shared/fontExtractionCapability.js` 會讓 production extraction fail closed，除非短效 runtime evidence 與設定的 Cloudflare compatibility date、fetch implementation revision、required scenario set 相符。`vite.config.js` 在本機 Vite development 只 mirror IP lookup（`/api/iplookup`）；測試其他 Functions 時使用 Cloudflare Pages local runtime。

Font extraction 將 HTML `rel` 值視為 case-insensitive token lists，並依宣告順序回傳每個 font-face source list 中的所有 remote `url()` candidates。Local/data sources 會被忽略，但不會遮蔽後續 remote fallback；candidates 依 normalized absolute URL 與 face metadata 去重。

正式環境 rate limits 由 `workers/rate-limiter/` 中 service-bound Worker 執行；root `wrangler.jsonc` 以 `RATE_LIMITER_SERVICE` 將 Pages Functions 綁定到它。完整 local integration testing 時需另外啟動該 Worker。`npm run platform:integration` 會以隔離 local state 啟動 Pages 與 Worker configs，證明 concurrent requests 會觸發設定的 platform limit，並證明缺少 service binding 時會 fail closed。In-process limiter 只可在 explicit development mode 使用；production 缺少 binding 時會 fail closed。

`config/rateLimitPolicies.js` 是 Pages helpers、Worker、local integration 與 configuration validation 共用的 canonical route-policy source。Wrangler 平台要求的 numeric declarations 會與它比對；unknown、orphaned、missing 或數值不符的 bindings 都會讓 `platform:check` 失敗。Pages-side deadline 綁到 service-binding `Request.signal`，因此 timeout 不只限制 caller，也會把 cancellation 傳到 Worker runtime，同時維持同一個 fail-closed 503 response。

`test/integration/ssrf-worker/` 與 `test/integration/ssrf-target-worker/` 是 outbound-fetch boundary 的隔離 Cloudflare-runtime fixtures。只有預計進行 temporary Cloudflare deployment 時才執行 `npm run test:ssrf-runtime`；它使用未被 claim、會自動過期的 preview account，不會印出 token 或 claim URL。成功輸出包含與 compatibility date、fetch implementation revision 綁定的 machine-readable 30-day gate metadata；metadata 缺失、不符、不完整或過期時，production extraction 仍保持 disabled。

### Local completion 與 deferred Cloudflare operations

C06–C16 repository 與 local-runtime remediation scope 於 2026-07-26 接受為完成。Production deployment、live Cloudflare SSRF evidence 與 staged HSTS observation 是由 owner 延後的 operational work，不是 local development completion 的前置條件。若日後回報 Cloudflare development 或 deployment error，視情況使用 `npm run platform:check`、`npm run platform:integration` 與 opt-in `npm run test:ssrf-runtime` evidence workflow；不要因為這些 commands 存在就推定有 deployment permission。

Wrangler configuration files（`wrangler.jsonc`、`workers/rate-limiter/wrangler.jsonc` 與 integration fixture configs）納入版本控制；local Wrangler state 與 credentials 不納入：

- `.wrangler/`、`.wrangler-*/`、`.tmp-*/` 是 disposable runtime/log/state directories，會被忽略。
- `.dev.vars` 與 `.dev.vars.*` 會被忽略，因為可能含 secrets；`.dev.vars.example` 保留為安全 template。
- `dist/`、`coverage/`、`.playwright-cli/`、`test-results/` 與 `playwright-report/` 是本機產生物並忽略。
- `code_reviews/` 包含忽略的 local review working records。它們是有日期的歷史 snapshot，不受版本控制，也不是目前 project status 或 canonical instructions。

### Repository hygiene

建置、測試、操作或維護專案所需的 root files/directories 維持版本控制：

- `src/`、`public/`、`functions/`、`workers/`、`config/`、`scripts/`、`test/` 與 `e2e/` 包含 application code、runtime assets、policies、automation 或 verification fixtures。
- `package.json`、`package-lock.json`、`.nvmrc`、`index.html`，以及 ESLint、JavaScript、Knip、Playwright、PostCSS、Tailwind、Vite、Vitest、Wrangler config files 定義可重現的 local development 與 verification。
- `.github/` 包含 CI 與 dependency-maintenance config；`.agents/AGENTS.md` 包含 repository-scoped development instructions。
- `README.md`、`README.zh-TW.md`、`CONTRIBUTING.md`、`ARCHITECTURE.md`、`PRIVACY.md`、`TODO.md` 與 `LICENSE` 是維護中的 project documentation 或 legal material。
- `.dev.vars.example` 是安全、不含 secret 的 local-runtime documentation；實際 `.dev.vars*` files 維持 ignored。

Editor state、dependency installations、generated output、test reports、local Cloudflare state、private environment files、incoming scratch data 與 review artifacts 只屬於 local workspace，並由 `.gitignore` 排除。
