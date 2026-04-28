/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

document.addEventListener('DOMContentLoaded', () => {
  const PLAYGROUND_LAB_URL =
    'https://jupyterlab-plugin-playground.readthedocs.io/en/latest/lite/lab/index.html';
  const PLAYGROUND_NOTEBOOK_URL =
    'https://jupyterlab-plugin-playground.readthedocs.io/en/latest/lite/tree/index.html';
  const LOADED_LABEL = 'Unload Interactive Example';
  const PLAYGROUND_PARAM = 'plugin';
  const HIDE_QUERY_PARAM = 'hide';
  const HIDE_QUERY_VALUE_ALL = 'all';
  const HIDE_QUERY_VALUE_MENU = 'menu';
  const HIDE_QUERY_VALUE_STATUSBAR = 'statusbar';
  const VALID_HIDE_VALUES = new Set([
    HIDE_QUERY_VALUE_ALL,
    HIDE_QUERY_VALUE_MENU,
    HIDE_QUERY_VALUE_STATUSBAR
  ]);

  const bytesToBase64Url = bytes => {
    let binary = '';
    const chunkSize = 0x8000;

    for (let index = 0; index < bytes.length; index += chunkSize) {
      const chunk = bytes.subarray(index, index + chunkSize);
      binary += String.fromCharCode(...chunk);
    }

    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  };

  const readStreamBytes = async stream => {
    const reader = stream.getReader();
    const chunks = [];
    let totalBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (!value || value.length === 0) {
        continue;
      }
      totalBytes += value.length;
      chunks.push(value);
    }

    const merged = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    return merged;
  };

  const gzipBytesIfSupported = async bytes => {
    if (typeof CompressionStream === 'undefined') {
      return null;
    }
    try {
      const stream = new Blob([bytes])
        .stream()
        .pipeThrough(new CompressionStream('gzip'));
      return await readStreamBytes(stream);
    } catch {
      return null;
    }
  };

  const normalizeEmbeddedSource = source => {
    const lines = source.replace(/\r\n/g, '\n').split('\n');
    while (lines.length > 0 && lines[0].trim() === '') {
      lines.shift();
    }
    while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
      lines.pop();
    }
    const indentLevels = lines
      .filter(line => line.trim() !== '')
      .map(line => line.match(/^ */)?.[0].length ?? 0);
    const minIndent = indentLevels.length > 0 ? Math.min(...indentLevels) : 0;
    return lines.map(line => line.slice(minIndent)).join('\n');
  };

  const getPlaygroundHideValues = embed => {
    const hideValues = new Set();
    const configuredHideValues = (embed.dataset.playgroundHide || '').split(
      ','
    );

    for (const rawValue of configuredHideValues) {
      const value = rawValue.trim().toLowerCase();
      if (VALID_HIDE_VALUES.has(value)) {
        hideValues.add(value);
      }
    }

    return Array.from(hideValues);
  };

  const getPlaygroundQuery = embed => {
    const params = new URLSearchParams(embed.dataset.playgroundQuery || '');
    for (const hideValue of getPlaygroundHideValues(embed)) {
      params.append(HIDE_QUERY_PARAM, hideValue);
    }
    const query = params.toString();
    return query || null;
  };

  const applyPlaygroundQuery = (source, query) => {
    if (!query) {
      return source;
    }
    const url = new URL(source);
    const params = new URLSearchParams(query);
    const queryKeys = new Set(params.keys());
    for (const key of queryKeys) {
      url.searchParams.delete(key);
      for (const value of params.getAll(key)) {
        url.searchParams.append(key, value);
      }
    }
    return url.toString();
  };

  const applyPlaygroundToken = (source, token) => {
    if (!token) {
      return source;
    }
    const url = new URL(source);
    url.searchParams.delete(PLAYGROUND_PARAM);
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
    hashParams.set(PLAYGROUND_PARAM, token);
    url.hash = hashParams.toString();
    return url.toString();
  };

  const createExternalLinkIcon = () => {
    const icon = document.createElement('i');
    icon.className = 'fa fa-external-link';
    icon.setAttribute('aria-hidden', 'true');
    return icon;
  };

  const ensureActionLink = (actions, options) => {
    const {
      selector,
      className,
      href,
      label,
      title,
      ariaLabel,
      target = '_blank',
      rel = 'noopener noreferrer'
    } = options;
    let link = actions.querySelector(selector);
    if (!(link instanceof HTMLAnchorElement)) {
      link = document.createElement('a');
      if (className) {
        link.className = className;
      }
      actions.appendChild(link);
    }
    link.href = href;
    link.target = target;
    link.rel = rel;
    link.title = title;
    if (ariaLabel) {
      link.setAttribute('aria-label', ariaLabel);
    }
    link.textContent = `${label} `;
    link.appendChild(createExternalLinkIcon());
    return link;
  };

  const ensureEmbedSkeleton = embed => {
    const descriptionText = embed.dataset.playgroundDescription || '';
    if (
      descriptionText &&
      !embed.querySelector('.jp-plugin-playground-description')
    ) {
      const description = document.createElement('p');
      description.className = 'jp-plugin-playground-description';
      description.textContent = descriptionText;
      embed.appendChild(description);
    }

    let actions = embed.querySelector('.jp-plugin-playground-actions');
    if (!(actions instanceof HTMLElement)) {
      actions = document.createElement('div');
      actions.className = 'jp-plugin-playground-actions';
      embed.appendChild(actions);
    }

    let loadButton = actions.querySelector('.jp-plugin-playground-load');
    if (!(loadButton instanceof HTMLButtonElement)) {
      loadButton = document.createElement('button');
      loadButton.type = 'button';
      loadButton.className = 'jp-plugin-playground-load';
      loadButton.textContent = 'Load Interactive Example';
      actions.insertBefore(loadButton, actions.firstChild);
    }

    const labHref = embed.dataset.playgroundLabHref || PLAYGROUND_LAB_URL;
    const notebookHref =
      embed.dataset.playgroundNotebookHref || PLAYGROUND_NOTEBOOK_URL;

    ensureActionLink(actions, {
      selector: '.jp-plugin-playground-open',
      className: 'jp-plugin-playground-open',
      href: labHref,
      label: 'JupyterLab',
      title: 'Open full JupyterLab view in a new tab'
    });

    const fallbackNotebookLink = Array.from(actions.querySelectorAll('a')).find(
      link => !link.classList.contains('jp-plugin-playground-open')
    );
    if (
      fallbackNotebookLink instanceof HTMLAnchorElement &&
      !fallbackNotebookLink.classList.contains('jp-plugin-playground-notebook')
    ) {
      fallbackNotebookLink.classList.add('jp-plugin-playground-notebook');
    }

    ensureActionLink(actions, {
      selector: '.jp-plugin-playground-notebook',
      className: 'jp-plugin-playground-notebook',
      href: notebookHref,
      label: 'Notebook v7',
      title: 'Open lightweight Notebook v7 view in a new tab'
    });

    let frame = embed.querySelector('.jp-plugin-playground-frame');
    if (!(frame instanceof HTMLElement)) {
      frame = document.createElement('div');
      frame.className = 'jp-plugin-playground-frame';
      frame.hidden = true;
      embed.appendChild(frame);
    }

    let iframe = frame.querySelector('.jp-plugin-playground-iframe');
    if (!(iframe instanceof HTMLIFrameElement)) {
      iframe = document.createElement('iframe');
      iframe.className = 'jp-plugin-playground-iframe';
      frame.appendChild(iframe);
    }

    iframe.title =
      embed.dataset.playgroundTitle ||
      iframe.title ||
      'Plugin playground example';
    iframe.loading = 'lazy';
    iframe.referrerPolicy = 'no-referrer';
    iframe.allow = 'clipboard-read; clipboard-write';

    return { loadButton, frame, iframe };
  };

  const getPlaygroundToken = async embed => {
    const sourceId = embed.dataset.playgroundSourceId;
    if (!sourceId) {
      return null;
    }
    const sourceNode = document.getElementById(sourceId);
    if (!(sourceNode instanceof HTMLElement)) {
      console.warn(
        `Plugin Playground embed source element #${sourceId} was not found.`
      );
      return null;
    }

    const source = normalizeEmbeddedSource(sourceNode.textContent ?? '');
    if (!source) {
      return null;
    }

    const requestedFileName = embed.dataset.playgroundFileName || 'index.ts';
    const fileName = requestedFileName.split(/[\\/]/).pop() || 'index.ts';

    try {
      const payload = JSON.stringify({
        version: 1,
        kind: 'file',
        fileName,
        source
      });
      const rawBytes = new TextEncoder().encode(payload);
      const compressedBytes = await gzipBytesIfSupported(rawBytes);
      const useCompressed =
        !!compressedBytes && compressedBytes.length < rawBytes.length;
      const codec = useCompressed ? 'g' : 'r';
      const payloadBytes = useCompressed ? compressedBytes : rawBytes;

      return `1.${codec}.${bytesToBase64Url(payloadBytes)}`;
    } catch (error) {
      console.warn(
        'Failed to encode embedded Plugin Playground source.',
        error
      );
      return null;
    }
  };

  const getIframeSource = (embed, defaultSource, query, token) => {
    let source = defaultSource;
    source = applyPlaygroundQuery(source, query);
    source = applyPlaygroundToken(source, token);

    const url = new URL(source);
    url.searchParams.set('embed', '1');
    return url.toString();
  };

  const configureActionLinks = (embed, query, token) => {
    const links = embed.querySelectorAll('.jp-plugin-playground-actions a');
    for (const link of links) {
      if (!(link instanceof HTMLAnchorElement)) {
        continue;
      }
      let source = link.href;
      source = applyPlaygroundQuery(source, query);
      source = applyPlaygroundToken(source, token);
      link.href = source;
    }
  };

  const embeds = document.querySelectorAll('.jp-plugin-playground-embed');

  for (const embed of embeds) {
    if (!(embed instanceof HTMLElement)) {
      continue;
    }

    const { loadButton, frame, iframe } = ensureEmbedSkeleton(embed);
    const openLink = embed.querySelector('.jp-plugin-playground-open');

    if (
      !(openLink instanceof HTMLAnchorElement) ||
      !(frame instanceof HTMLElement) ||
      !(iframe instanceof HTMLIFrameElement)
    ) {
      continue;
    }

    const defaultLabel =
      loadButton.textContent?.trim() || 'Load Interactive Example';

    loadButton.textContent = defaultLabel;
    loadButton.setAttribute('aria-pressed', 'false');

    const query = getPlaygroundQuery(embed);
    const tokenPromise = getPlaygroundToken(embed);
    tokenPromise.then(token => {
      configureActionLinks(embed, query, token);
    });

    loadButton.addEventListener('click', async () => {
      const isLoaded = frame.hidden === false;

      if (!isLoaded) {
        const token = await tokenPromise;
        iframe.src = getIframeSource(embed, openLink.href, query, token);
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
