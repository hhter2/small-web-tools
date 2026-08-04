from pathlib import Path


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected exactly one match, found {count}')
    return text.replace(old, new, 1)


app_path = Path('src/App.jsx')
app = app_path.read_text()
app = replace_once(
    app,
    "import SimpleHome from './components/SimpleHome.jsx';\n",
    "import SimpleHome from './components/SimpleHome.jsx';\nimport LanguageSwitcher from './components/LanguageSwitcher.jsx';\n",
    'App LanguageSwitcher import',
)
app = replace_once(
    app,
    "import { changeLocale, SUPPORTED_LOCALES } from './i18n/index.js';\n",
    '',
    'App legacy i18n import',
)
app = replace_once(
    app,
    "  const [langDropdownOpen, setLangDropdownOpen] = useState(false);\n",
    '',
    'App legacy language state',
)
app = replace_once(
    app,
    "      setOpenDropdown(null);\n      setLangDropdownOpen(false);\n",
    "      setOpenDropdown(null);\n",
    'App outside click language state',
)
mobile_anchor = """          <span className="min-w-0 flex-1 truncate font-['TASA_Orbiter',sans-serif] font-bold text-[1.15rem] text-accent">Small Web Tools</span>
          <button
"""
mobile_replacement = """          <span className="min-w-0 flex-1 truncate font-['TASA_Orbiter',sans-serif] font-bold text-[1.15rem] text-accent">Small Web Tools</span>
          <LanguageSwitcher variant="mobile" />
          <button
"""
app = replace_once(
    app,
    mobile_anchor,
    mobile_replacement,
    'App mobile header placement',
)
start_marker = '              {/* Language Selector */}'
end_marker = '              {/* Theme Toggle (Desktop Header) */}'
start = app.index(start_marker)
end = app.index(end_marker, start)
desktop_replacement = """              {/* Language Selector */}
              {!modeProfile.simplified && (
                <LanguageSwitcher
                  variant="desktop"
                  onOpen={() => setOpenDropdown(null)}
                />
              )}

"""
app = app[:start] + desktop_replacement + app[end:]
if 'langDropdownOpen' in app or 'SUPPORTED_LOCALES' in app or 'changeLocale(' in app:
    raise RuntimeError('App still contains legacy language-selector logic')
app_path.write_text(app)

Path('src/main.jsx').write_text("""import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n/index.js';
import App from './App.jsx';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
""")

provider_path = Path('src/components/LanguageSwitcherProvider.jsx')
if not provider_path.exists():
    raise RuntimeError('LanguageSwitcherProvider.jsx was not found')
provider_path.unlink()

Path('src/tests/languageSwitcher.test.jsx').write_text("""import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';
import { changeLocale } from '../i18n/index.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

function pressKey(element, key) {
  element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

beforeEach(async () => {
  await changeLocale('en-US');
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  await changeLocale('en-US');
});

describe('LanguageSwitcher', () => {
  it('moves focus into the menu and supports roving keyboard navigation', async () => {
    await act(async () => root.render(<LanguageSwitcher />));
    const trigger = container.querySelector('button[aria-haspopup="menu"]');

    await act(async () => trigger.click());
    const items = [...container.querySelectorAll('[role="menuitemradio"]')];

    expect(items).toHaveLength(2);
    expect(document.activeElement).toBe(items[0]);

    await act(async () => pressKey(items[0], 'ArrowDown'));
    expect(document.activeElement).toBe(items[1]);

    await act(async () => pressKey(items[1], 'Home'));
    expect(document.activeElement).toBe(items[0]);

    await act(async () => pressKey(items[0], 'End'));
    expect(document.activeElement).toBe(items[1]);

    await act(async () => pressKey(items[1], 'Escape'));
    expect(container.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('selects a locale from the mobile control and restores trigger focus', async () => {
    await act(async () => root.render(<LanguageSwitcher variant="mobile" />));
    const trigger = container.querySelector('button[aria-haspopup="menu"]');

    await act(async () => pressKey(trigger, 'ArrowDown'));
    const traditionalChinese = [...container.querySelectorAll('[role="menuitemradio"]')][1];

    await act(async () => traditionalChinese.click());

    expect(document.documentElement.lang).toBe('zh-TW');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(container.querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('closes on an outside pointer interaction', async () => {
    await act(async () => root.render(<LanguageSwitcher />));
    const trigger = container.querySelector('button[aria-haspopup="menu"]');

    await act(async () => trigger.click());
    expect(container.querySelector('[role="menu"]')).not.toBeNull();

    await act(async () => {
      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    });
    expect(container.querySelector('[role="menu"]')).toBeNull();
  });
});
""")

Path('e2e/language-switcher.spec.js').write_text("""import { expect, test } from '@playwright/test';

test('mobile language control is mounted in the real header and restores focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/home');

  const switcher = page.locator('[data-language-switcher="mobile"]');
  const trigger = switcher.locator('button[aria-haspopup="menu"]');
  await expect(switcher).toBeVisible();

  await trigger.focus();
  await trigger.press('ArrowDown');
  const options = page.getByRole('menuitemradio');
  await expect(options).toHaveCount(2);
  await expect(options.first()).toBeFocused();

  await options.first().press('ArrowDown');
  await expect(options.nth(1)).toBeFocused();
  await options.nth(1).press('Enter');

  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW');
  await expect(trigger).toBeFocused();
});

test('desktop language control follows the workspace visibility contract', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/home');
  await expect(page.locator('[data-language-switcher="desktop"]')).toBeVisible();

  await page.goto('/simple');
  await expect(page.locator('[data-language-switcher="desktop"]')).toHaveCount(0);
});
""")

Path('docs/architecture/language-switcher.md').write_text("""# Language switcher architecture

The responsive language controls are rendered directly by `App.jsx` in one React application tree.

- `src/components/LanguageSwitcher.jsx` is the only implementation of locale choices, selection, menu state, keyboard navigation, and focus restoration.
- `App.jsx` renders the mobile variant in `#mobile-header` and the desktop variant in the desktop control group.
- The desktop variant is omitted in the Simple workspace to preserve the shell visibility contract.
- `src/main.jsx` mounts `App` directly. No language-switcher portal or secondary mount is used.

The menu follows the ARIA menu-button pattern with `menuitemradio` options. Opening moves focus to the selected locale. Arrow keys, Home, End, Escape, pointer selection, outside-pointer dismissal, and trigger-focus restoration are covered by `src/tests/languageSwitcher.test.jsx`; real header placement and workspace visibility are covered by `e2e/language-switcher.spec.js`.
""")

Path('docs/architecture/language-switcher.zh-TW.md').write_text("""# 語言切換器架構

回應式語言控制項由 `App.jsx` 直接渲染於同一棵 React 應用程式樹。

- `src/components/LanguageSwitcher.jsx` 是地區設定選項、選取流程、選單狀態、鍵盤導覽與焦點復原的唯一實作。
- `App.jsx` 在 `#mobile-header` 渲染行動版，並在桌面控制群組渲染桌面版。
- Simple 工作區不渲染桌面版，以保留既有 shell 顯示契約。
- `src/main.jsx` 直接掛載 `App`；語言切換器不使用 portal 或第二個 mount。

選單採用 ARIA menu button 模式，選項使用 `menuitemradio`。開啟時焦點會移至目前選取的地區設定；方向鍵、Home、End、Escape、指標選取、外部指標關閉及觸發按鈕焦點復原由 `src/tests/languageSwitcher.test.jsx` 覆蓋，實際 header 位置與工作區顯示狀態則由 `e2e/language-switcher.spec.js` 覆蓋。
""")

architecture_path = Path('ARCHITECTURE.md')
architecture = architecture_path.read_text()
architecture = replace_once(
    architecture,
    '│       ├── SimpleHome.jsx    Search-first essential-tool launcher\n',
    '│       ├── SimpleHome.jsx    Search-first essential-tool launcher\n│       ├── LanguageSwitcher.jsx Shared responsive locale menu and focus lifecycle\n',
    'English architecture component map',
)
architecture = replace_once(
    architecture,
    'The shell supplies a responsive desktop sidebar, mobile drawer, top navigation, breadcrumbs, footer, search, theme control, and a centered tool stage.\n',
    'The shell supplies a responsive desktop sidebar, mobile drawer, top navigation, breadcrumbs, footer, search, theme control, and a centered tool stage.\n\n`src/components/LanguageSwitcher.jsx` is rendered directly by `App.jsx` in the mobile and desktop headers. It is the shared owner of locale options, menu state, keyboard navigation, and focus restoration; the desktop control is omitted in the Simple workspace.\n',
    'English architecture shell ownership',
)
architecture = replace_once(
    architecture,
    'The language menu in `App.jsx` calls `changeLocale()`, updates\n`document.documentElement.lang`, and persists only the normalized supported\nlocale. Storage failures do not prevent an in-memory language change.\n',
    '`src/components/LanguageSwitcher.jsx` calls `changeLocale()`, updates\n`document.documentElement.lang`, and persists only the normalized supported\nlocale. Storage failures do not prevent an in-memory language change.\n',
    'English architecture locale ownership',
)
architecture_path.write_text(architecture)

architecture_zh_path = Path('ARCHITECTURE.zh-TW.md')
architecture_zh = architecture_zh_path.read_text()
architecture_zh = replace_once(
    architecture_zh,
    '- src/：React 應用程式、工具登錄表、樣式、共用 UI、工具元件與測試。\n',
    '- src/：React 應用程式、工具登錄表、樣式、共用 UI、工具元件與測試。\n- src/components/LanguageSwitcher.jsx：桌面與行動 header 共用的地區設定選單、鍵盤導覽與焦點生命週期。\n',
    'Traditional Chinese architecture component map',
)
architecture_zh = replace_once(
    architecture_zh,
    'Shell 提供可回應式的桌面側邊欄、行動抽屜、頂端導覽、麵包屑、footer、搜尋、主題控制項\n與置中的工具工作區。\n',
    'Shell 提供可回應式的桌面側邊欄、行動抽屜、頂端導覽、麵包屑、footer、搜尋、主題控制項\n與置中的工具工作區。\n\n`src/components/LanguageSwitcher.jsx` 由 `App.jsx` 直接渲染於行動與桌面 header。它是地區設定選項、選單狀態、鍵盤導覽與焦點復原的共用負責元件；Simple 工作區不渲染桌面控制項。\n',
    'Traditional Chinese architecture shell ownership',
)
architecture_zh = replace_once(
    architecture_zh,
    '瀏覽器偏好的語言，最後使用 `en-US`。`App.jsx` 的語言選單呼叫 `changeLocale()`，更新\n`document.documentElement.lang`，並只儲存正規化後的支援地區設定；儲存失敗不會阻止\n記憶體中的切換。\n',
    '瀏覽器偏好的語言，最後使用 `en-US`。`src/components/LanguageSwitcher.jsx` 呼叫\n`changeLocale()`，更新 `document.documentElement.lang`，並只儲存正規化後的支援地區設定；\n儲存失敗不會阻止記憶體中的切換。\n',
    'Traditional Chinese architecture locale ownership',
)
architecture_zh_path.write_text(architecture_zh)
