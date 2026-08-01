import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import ExternalMapPreview from '../components/ExternalMapPreview.jsx';
import { revokeConsent } from '../lib/thirdPartyServices.js';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

describe('ExternalMapPreview', () => {
  let container;
  let root;

  beforeEach(() => {
    localStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it('keeps coordinates local until OSM consent and removes the iframe on revocation', async () => {
    await act(async () => {
      root.render(<ExternalMapPreview latitude={25.033} longitude={121.5654} title="GPS Location" />);
    });
    expect(container.textContent).toContain('25.033, 121.5654');
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.innerHTML).not.toContain('openstreetmap.org/export');

    const enableButton = [...container.querySelectorAll('button')]
      .find((button) => button.textContent.includes('Enable OpenStreetMap'));
    await act(async () => enableButton.click());
    expect(container.querySelector('iframe')?.src).toContain('www.openstreetmap.org/export/embed.html');
    expect(localStorage.getItem('small_web_tools_consent')).not.toContain('25.033');

    await act(async () => revokeConsent('osm'));
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.textContent).toContain('25.033, 121.5654');
  });
});
