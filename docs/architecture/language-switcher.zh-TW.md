# 語言切換器架構

回應式語言控制項由同一棵 React 應用程式樹負責。

- `src/components/LanguageSwitcher.jsx` 是地區設定選項、選取流程、選單狀態、鍵盤導覽與焦點復原的唯一實作。
- `src/components/LanguageSwitcherProvider.jsx` 包住 `App`，並將桌面版與行動版呈現放入既有 shell 的位置。
- `src/main.jsx` 以單一根階層掛載 provider 與 `App`。原本獨立並列的 `MobileLanguageSwitcher` 根子元件已移除。
- `App.jsx` 中舊有的語言標記目前由 provider 隱藏，以避免此次修正同時大幅改動大型應用程式 shell；它不再負責實際的地區設定行為。

選單採用 ARIA menu button 模式，選項使用 `menuitemradio`。開啟時焦點會移至目前選取的地區設定；方向鍵、Home、End、Escape、指標選取、外部指標關閉，以及回復觸發按鈕焦點，皆由 `src/tests/languageSwitcher.test.jsx` 覆蓋。
