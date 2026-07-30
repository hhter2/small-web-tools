import React, { useEffect, useId, useRef } from 'react';

export const TRANSPARENT_PREVIEW_CLASS = 'bg-[linear-gradient(45deg,#ddd_25%,transparent_25%),linear-gradient(-45deg,#ddd_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#ddd_75%),linear-gradient(-45deg,transparent_75%,#ddd_75%)] bg-[length:20px_20px] bg-[position:0_0,0_10px,10px_-10px,-10px_0px]';

export function FullscreenPreviewButton({
  disabled = false,
  label = 'Open fullscreen preview',
  onClick,
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="fullscreen-preview-control absolute right-2 top-2 z-20 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-black/65 text-white shadow-lg backdrop-blur-sm transition hover:scale-105 hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-white/80 disabled:cursor-not-allowed disabled:opacity-35"
    >
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M8 3H3v5" />
        <path d="M16 3h5v5" />
        <path d="M8 21H3v-5" />
        <path d="M16 21h5v-5" />
      </svg>
    </button>
  );
}

export default function FullscreenPreview({
  children,
  open,
  onClose,
  title = 'Fullscreen preview',
  surfaceClassName = 'bg-card',
}) {
  const titleId = useId();
  const closeButtonRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
      } else if (event.key === 'Tab') {
        event.preventDefault();
        closeButtonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[92vh] w-full max-w-6xl items-center justify-center overflow-hidden rounded-xl border border-white/20 bg-black/30 p-3 shadow-2xl sm:p-5"
      >
        <h2 id={titleId} className="sr-only">{title}</h2>
        <button
          ref={closeButtonRef}
          type="button"
          aria-label="Close fullscreen preview"
          title="Close fullscreen preview"
          onClick={onClose}
          className="absolute right-2 top-2 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-black/70 text-white shadow-lg transition hover:scale-105 hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-white/80"
        >
          <svg
            viewBox="0 0 24 24"
            width="19"
            height="19"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M6 6l12 12" />
            <path d="M18 6L6 18" />
          </svg>
        </button>
        <div className={`flex max-h-[84vh] min-h-64 w-full items-center justify-center overflow-auto rounded-lg p-4 ${surfaceClassName}`}>
          {children}
        </div>
      </section>
    </div>
  );
}
