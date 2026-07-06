// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { IMarkdownBlockToken } from '@jupyterlab/rendermime';

/**
 * A source line (0-based) mapped to a vertical offset (in pixels) within the
 * preview scroll container content.
 */
export interface IScrollMarker {
  line: number;
  top: number;
}

/**
 * A source line (0-based) mapped to a rendered block element in the preview.
 */
export interface IAnchor {
  line: number;
  element: Element;
}

/**
 * Linearly interpolate across the marker list.
 *
 * When `by` is `'line'`, map a source line to a preview offset (in pixels).
 * When `by` is `'top'`, map a preview offset (in pixels) to a source line.
 */
export function interpolate(
  markers: IScrollMarker[],
  value: number,
  by: 'line' | 'top'
): number {
  const to = by === 'line' ? 'top' : 'line';
  if (value <= markers[0][by]) {
    return markers[0][to];
  }
  for (let i = 0; i < markers.length - 1; i++) {
    const a = markers[i];
    const b = markers[i + 1];
    if (value < b[by]) {
      const span = b[by] - a[by];
      const fraction = span === 0 ? 0 : (value - a[by]) / span;
      return a[to] + fraction * (b[to] - a[to]);
    }
  }
  return markers[markers.length - 1][to];
}

/**
 * Pair top-level markdown block tokens with compatible top-level preview
 * elements.
 */
export function buildBlockAnchors(
  tokens: IMarkdownBlockToken[],
  container: HTMLElement,
  lineOffset = 0
): IAnchor[] {
  const elements = Array.from(container.children);
  const anchors: IAnchor[] = [];
  let elementIndex = 0;

  for (const token of tokens) {
    if (!rendersElement(token)) {
      continue;
    }

    const index = findMatchingElement(token, elements, elementIndex);
    if (index === -1) {
      continue;
    }

    anchors.push({
      line: token.line + lineOffset,
      element: elements[index]
    });
    elementIndex = index + 1;
  }

  return anchors;
}

/**
 * Find the index of the first element at or after `start` that matches the
 * token, or `-1`.
 */
function findMatchingElement(
  token: IMarkdownBlockToken,
  elements: Element[],
  start: number
): number {
  for (let i = start; i < elements.length; i++) {
    if (matchesElement(token, elements[i])) {
      return i;
    }
  }
  return -1;
}

/**
 * Whether the token renders at least one top-level element.
 */
function rendersElement(token: IMarkdownBlockToken): boolean {
  if (token.type === 'space' || token.type === 'def' || token.type === 'text') {
    return false;
  }
  if (token.type === 'html') {
    return firstHtmlTag(token.raw) !== null;
  }
  return true;
}

/**
 * Whether an element is a plausible rendering of the token.
 */
function matchesElement(token: IMarkdownBlockToken, element: Element): boolean {
  switch (token.type) {
    case 'blockquote':
      return element.tagName === 'BLOCKQUOTE';
    case 'code':
      // Fenced blocks are usually rendered as `<pre>`, but some languages are
      // rendered by dedicated renderers, such as mermaid diagrams.
      return (
        element.tagName === 'PRE' ||
        element.classList.contains('jp-RenderedMermaid')
      );
    case 'heading':
      return /^H[1-6]$/.test(element.tagName);
    case 'hr':
      return element.tagName === 'HR';
    case 'html':
      return element.tagName.toLowerCase() === firstHtmlTag(token.raw);
    case 'list':
      return element.tagName === 'OL' || element.tagName === 'UL';
    case 'paragraph':
      return element.tagName === 'P';
    case 'table':
      return element.tagName === 'TABLE';
    default:
      return false;
  }
}

/**
 * The tag name of the first HTML element in a raw HTML block, or `null`.
 */
function firstHtmlTag(raw: string): string | null {
  const match = raw.match(/^\s*<([a-z][\w:-]*)\b/i);
  return match ? match[1].toLowerCase() : null;
}
