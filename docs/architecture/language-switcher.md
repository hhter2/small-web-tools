# Language switcher architecture

The responsive language controls are owned by one React application tree.

- `src/components/LanguageSwitcher.jsx` is the only implementation of locale choices, selection, menu state, keyboard navigation, and focus restoration.
- `src/components/LanguageSwitcherProvider.jsx` wraps `App` and places desktop and mobile presentations into the existing shell positions.
- `src/main.jsx` mounts the provider and `App` as one root hierarchy. The former standalone `MobileLanguageSwitcher` root child is removed.
- The legacy language markup in `App.jsx` remains temporarily hidden by the provider to keep this change isolated from the large application-shell component. It does not own active locale behavior.

The menu follows the ARIA menu-button pattern with `menuitemradio` options. Opening moves focus to the selected locale. Arrow keys, Home, End, Escape, pointer selection, outside-pointer dismissal, and trigger-focus restoration are covered by `src/tests/languageSwitcher.test.jsx`.
