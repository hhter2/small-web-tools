import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import LanguageSwitcher from './LanguageSwitcher.jsx';

function createMount(parent, beforeElement, name) {
  const mount = document.createElement('div');
  mount.className = 'contents';
  mount.dataset.languageSwitcherMount = name;
  parent.insertBefore(mount, beforeElement);
  return mount;
}

export default function LanguageSwitcherProvider({ children }) {
  const [mounts, setMounts] = useState({ mobile: null, desktop: null });

  useEffect(() => {
    const mobileHeader = document.getElementById('mobile-header');
    const desktopSearch = document.querySelector('.header-search-input');
    const desktopSearchContainer = desktopSearch?.closest('.relative');
    const desktopControls = desktopSearchContainer?.parentElement;
    const legacyDesktopTrigger = desktopControls
      ? [...desktopControls.querySelectorAll('button[aria-haspopup="menu"]')][0]
      : null;
    const legacyDesktopContainer = legacyDesktopTrigger?.parentElement ?? null;

    if (!mobileHeader || !desktopControls || !legacyDesktopContainer) {
      return undefined;
    }

    const mobileMount = createMount(
      mobileHeader,
      mobileHeader.lastElementChild,
      'mobile',
    );
    const desktopMount = createMount(
      desktopControls,
      legacyDesktopContainer,
      'desktop',
    );
    const previousDisplay = legacyDesktopContainer.style.display;
    legacyDesktopContainer.style.display = 'none';
    setMounts({ mobile: mobileMount, desktop: desktopMount });

    return () => {
      legacyDesktopContainer.style.display = previousDisplay;
      mobileMount.remove();
      desktopMount.remove();
    };
  }, []);

  return (
    <>
      {children}
      {mounts.mobile && createPortal(
        <LanguageSwitcher variant="mobile" />,
        mounts.mobile,
      )}
      {mounts.desktop && createPortal(
        <LanguageSwitcher variant="desktop" />,
        mounts.desktop,
      )}
    </>
  );
}
