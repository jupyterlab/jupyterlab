/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

document.addEventListener('DOMContentLoaded', () => {
  const LOADED_LABEL = 'Unload Interactive Example';

  const getIframeSource = (embed, defaultSource) => {
    let source = embed.dataset.playgroundSrc || defaultSource;
    const mode = embed.dataset.playgroundMode;
    if (mode === 'simple') {
      source = source.replace('/lite/lab/', '/lite/tree/');
    } else if (mode === 'lab') {
      source = source.replace('/lite/tree/', '/lite/lab/');
    }
    const query = embed.dataset.playgroundQuery;
    if (query) {
      const url = new URL(source);
      const params = new URLSearchParams(query);
      for (const [key, value] of params.entries()) {
        url.searchParams.set(key, value);
      }
      source = url.toString();
    }
    const url = new URL(source);
    url.searchParams.set('embed', '1');
    source = url.toString();
    return source;
  };

  const embeds = document.querySelectorAll('.jp-plugin-playground-embed');

  for (const embed of embeds) {
    if (!(embed instanceof HTMLElement)) {
      continue;
    }

    const loadButton = embed.querySelector('.jp-plugin-playground-load');
    const openLink = embed.querySelector('.jp-plugin-playground-open');
    const frame = embed.querySelector('.jp-plugin-playground-frame');
    const iframe = embed.querySelector('.jp-plugin-playground-iframe');

    if (
      !(loadButton instanceof HTMLButtonElement) ||
      !(openLink instanceof HTMLAnchorElement) ||
      !(frame instanceof HTMLElement) ||
      !(iframe instanceof HTMLIFrameElement)
    ) {
      continue;
    }

    const defaultLabel =
      embed.dataset.playgroundLoadLabel ||
      loadButton.textContent?.trim() ||
      'Load Interactive Example';

    loadButton.textContent = defaultLabel;
    loadButton.setAttribute('aria-pressed', 'false');

    loadButton.addEventListener('click', () => {
      const isLoaded = frame.hidden === false;

      if (!isLoaded) {
        iframe.src = getIframeSource(embed, openLink.href);
        frame.hidden = false;
        loadButton.textContent = LOADED_LABEL;
        loadButton.setAttribute('aria-pressed', 'true');
      } else {
        iframe.removeAttribute('src');
        frame.hidden = true;
        loadButton.textContent = defaultLabel;
        loadButton.setAttribute('aria-pressed', 'false');
      }
    });
  }
});
