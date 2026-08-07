import React, { act, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MobileDrawer from '../components/MobileDrawer.jsx';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

function Harness({ onClose }) {
  const [open, setOpen] = useState(false);
  const openerRef = useRef(null);
  const close = () => {
    onClose();
    setOpen(false);
  };
  return (
    <>
      <button ref={openerRef} type="button" onClick={() => setOpen(true)}>Open</button>
      <main data-drawer-background><button type="button">Background action</button></main>
      {open && (
        <MobileDrawer
          label="Tool navigation"
          closeLabel="Close navigation"
          onClose={close}
          openerRef={openerRef}
        >
          <button type="button">Last drawer action</button>
        </MobileDrawer>
      )}
    </>
  );
}

function keyDown(key, shiftKey = false) {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, shiftKey, bubbles: true }));
}

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  document.body.style.overflow = '';
});

describe('MobileDrawer', () => {
  it('unmounts while closed and restores focus, inert state, and scrolling after Escape', async () => {
    const onClose = vi.fn();
    await act(async () => root.render(<Harness onClose={onClose} />));
    const opener = container.querySelector('button');
    const background = container.querySelector('main');

    expect(container.querySelector('[role="dialog"]')).toBeNull();
    await act(async () => opener.click());

    const closeButton = container.querySelector('[aria-label="Close navigation"]');
    const lastAction = [...container.querySelectorAll('button')].at(-1);
    expect(closeButton).toHaveFocus();
    expect(container.querySelector('[role="dialog"]')).toHaveAccessibleName('Tool navigation');
    expect(background.inert).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');

    await act(async () => keyDown('Tab', true));
    expect(lastAction).toHaveFocus();
    await act(async () => keyDown('Tab'));
    expect(closeButton).toHaveFocus();

    await act(async () => keyDown('Escape'));
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(background.inert).toBe(false);
    expect(document.body.style.overflow).toBe('');
    expect(opener).toHaveFocus();
  });
});
