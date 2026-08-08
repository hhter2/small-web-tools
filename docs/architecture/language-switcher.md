# Language switcher architecture

The responsive language controls are rendered in one React application tree composed by `App.jsx`.

- `src/components/LanguageSwitcher.jsx` is the only implementation of locale choices, selection, menu state, keyboard navigation, and focus restoration.
- `App.jsx` renders the mobile variant in `#mobile-header`; `AppHeader.jsx` renders the desktop variant.
- The desktop variant is omitted in the Simple workspace to preserve the shell visibility contract.
- `src/main.jsx` mounts `App` directly. No language-switcher portal or secondary mount is used.

The menu follows the ARIA menu-button pattern with `menuitemradio` options. Opening moves focus to the selected locale. Arrow keys, Home, End, Escape, pointer selection, outside-pointer dismissal, and trigger-focus restoration are covered by `src/tests/languageSwitcher.test.jsx`; real header placement and workspace visibility are covered by `e2e/language-switcher.spec.js`.
