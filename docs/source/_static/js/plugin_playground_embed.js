/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

document.addEventListener('DOMContentLoaded', () => {
  const LOADED_LABEL = 'Unload Interactive Example';
  const PLAYGROUND_PARAM = 'plugin';

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

  const applyPlaygroundQuery = (source, query) => {
    if (!query) {
      return source;
    }
    const url = new URL(source);
    const params = new URLSearchParams(query);
    for (const [key, value] of params.entries()) {
      url.searchParams.set(key, value);
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

  const applyPlaygroundMode = (source, mode) => {
    if (mode === 'simple') {
      return source.replace('/lite/lab/', '/lite/edit/');
    }
    return source;
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
    source = applyPlaygroundMode(source, embed.dataset.playgroundMode);
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
      loadButton.textContent?.trim() || 'Load Interactive Example';

    loadButton.textContent = defaultLabel;
    loadButton.setAttribute('aria-pressed', 'false');

    const query = embed.dataset.playgroundQuery;
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
