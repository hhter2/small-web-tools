# 自訂網域正式環境檢查表

只有在正式環境變更已獲明確核准時才使用本表。將 `PRODUCTION_HOST` 設為真實自訂網域，不可自行假設網域。

## 部署前

- 記錄負責人、候選 commit/tag、Cloudflare 專案、可回復的前一部署、維護時段與 `PRODUCTION_HOST`。
- 確認 DNS 所有權與路由，並確認有效憑證正確涵蓋測試主機。
- 確認 canonical `https://$PRODUCTION_HOST` 重新導向，並記錄 pages.dev／preview 是重新導向、限制存取或刻意保留。
- 考慮 HSTS `includeSubDomains` 或 preload 前須盤點所有受影響主機；本表不核准兩者。
- 執行 `npm ci`、`npm run verify`、`npm run platform:integration` 與 `npm run test:e2e`。
- 依實際受測功能與移除條件逐項檢查 `config/csp-exceptions.json`。

## 部署與驗證

1. 部署候選版本，但不得把 HSTS 提升到目前一天階段以上。
2. 記錄主機、憑證簽發者／到期日／狀態、部署 ID、UTC 時間，以及 `/` 和 `/api/iplookup?ip=not-an-ip` 的完整標頭快照。
3. 執行 `PRODUCTION_HOST=example.invalid npm run test:e2e:deployed`，以已記錄的主機取代範例。
4. 冒煙測試 FFmpeg、Mermaid、醒目顯示、影像／匯出下載、已同意的 OpenStreetMap、網速、匯率、IP 查詢及字型擷取器可用／fail-closed 行為，並記錄瀏覽器版本與結果。
5. 檢查 CSP 違規、重新導向迴圈、憑證錯誤、Function 失敗及非預期快取；未釐清前不得晉級。

## 快取、回復與 HSTS

- 內容雜湊靜態資產可維持快取；確認 HTML 與 Function 遵循宣告政策。回復需要時只清除受影響部署／origin。
- 回復時提升已記錄的前一部署，再重跑重新導向、憑證、標頭、Function 與代表性功能檢查。憑證或重新導向阻擋網站時，先回復自訂網域路由。
- HSTS 依序為一天、另行核准及觀察的 30 天、再另行核准及觀察的一年。
- `includeSubDomains` 與 preload 需要完整主機盤點、全部 HTTPS-only 證明、獨立回復審查及另行核准。

將完成的檢查表與部署記錄一併保存；不得提交憑證、token、私密憑證或內部事件資料。
