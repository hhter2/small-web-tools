import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export default function MobileDrawer({
  children,
  label,
  closeLabel,
  onClose,
  openerRef,
  style,
}) {
  const drawerRef = useRef(null);
  const closeButtonRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const background = [...document.querySelectorAll('[data-drawer-background]')]
      .filter((element) => element instanceof HTMLElement);
    const opener = openerRef.current;
    document.body.style.overflow = 'hidden';
    background.forEach((element) => { element.inert = true; });
    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = [...(drawerRef.current?.querySelectorAll(FOCUSABLE_SELECTOR) || [])]
        .filter((element) => !element.hasAttribute('disabled'));
      if (focusable.length === 0) {
        event.preventDefault();
        closeButtonRef.current?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      background.forEach((element) => { element.inert = false; });
      opener?.focus();
    };
  }, [openerRef]);

  return (
    <>
      <div
        id="mobile-drawer-overlay"
        aria-hidden="true"
        className="fixed bottom-0 left-0 right-0 z-[95] bg-[rgba(15,23,42,0.5)] backdrop-blur-[4px]"
        style={style}
        onMouseDown={onClose}
      />
      <aside
        ref={drawerRef}
        id="mobile-navigation-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="fixed bottom-0 left-0 z-[100] flex w-[260px] flex-col border-r border-border-sidebar bg-sidebar shadow-[10px_0_30px_rgba(0,0,0,0.15)] md:hidden"
        style={style}
      >
        <button
          ref={closeButtonRef}
          type="button"
          aria-label={closeLabel}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg border border-border-sidebar bg-sidebar text-text-sidebar-muted transition hover:bg-nav-hover-bg hover:text-text-sidebar focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
          onClick={onClose}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        {children}
      </aside>
    </>
  );
}
