/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

document.addEventListener('DOMContentLoaded', () => {
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

    loadButton.addEventListener('click', () => {
      if (!iframe.src) {
        iframe.src = openLink.href;
      }
      frame.hidden = false;
      loadButton.disabled = true;
      loadButton.textContent = 'Interactive Example Loaded';
    });
  }
});
