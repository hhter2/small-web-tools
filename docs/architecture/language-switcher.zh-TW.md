# 語言切換器架構

回應式語言控制項由 `App.jsx` 直接渲染於同一棵 React 應用程式樹。

- `src/components/LanguageSwitcher.jsx` 是地區設定選項、選取流程、選單狀態、鍵盤導覽與焦點復原的唯一實作。
- `App.jsx` 在 `#mobile-header` 渲染行動版，並在桌面控制群組渲染桌面版。
- Simple 工作區不渲染桌面版，以保留既有 shell 顯示契約。
- `src/main.jsx` 直接掛載 `App`；語言切換器不使用 portal 或第二個 mount。

選單採用 ARIA menu button 模式，選項使用 `menuitemradio`。開啟時焦點會移至目前選取的地區設定；方向鍵、Home、End、Escape、指標選取、外部指標關閉及觸發按鈕焦點復原由 `src/tests/languageSwitcher.test.jsx` 覆蓋，實際 header 位置與工作區顯示狀態則由 `e2e/language-switcher.spec.js` 覆蓋。
