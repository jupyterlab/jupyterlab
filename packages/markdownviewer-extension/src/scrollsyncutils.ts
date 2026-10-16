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
      return a[to] + ((value - a[by]) / (b[by] - a[by])) * (b[to] - a[to]);
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

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!rendersElement(token)) {
      continue;
    }
    let index = elementIndex;
    while (index < elements.length && !matchesElement(token, elements[index])) {
      index++;
    }
    if (index === elements.length) {
      continue;
    }
    anchors.push({ line: token.line + lineOffset, element: elements[index] });
    elementIndex = index + 1;
    if (token.type === 'html') {
      i = lastNestedToken(tokens, i, elements[index]);
    }
  }

  return anchors;
}

/**
 * The index of the last token nested in `element`, which renders the raw HTML
 * block `tokens[start]`, or `start` if the next block is not nested in it or
 * no html token closes it.
 */
function lastNestedToken(
  tokens: IMarkdownBlockToken[],
  start: number,
  element: Element
): number {
  let next = start + 1;
  while (next < tokens.length && !rendersElement(tokens[next])) {
    next++;
  }
  // The HTML parser closes some elements, such as `<p>`, at the next
  // block-level element.
  if (
    next === tokens.length ||
    !Array.from(element.children).some(child =>
      matchesElement(tokens[next], child)
    )
  ) {
    return start;
  }
  // Comments are matched too, so that the tags inside them are skipped.
  const tags = new RegExp(
    `<!--[\\s\\S]*?-->|<(/?)${element.tagName.toLowerCase()}\\b`,
    'gi'
  );
  let depth = 0;
  for (let i = start; i < tokens.length; i++) {
    if (tokens[i].type === 'html') {
      for (const [match, slash] of tokens[i].raw.matchAll(tags)) {
        if (!match.startsWith('<!--')) {
          depth += slash ? -1 : 1;
        }
      }
      if (depth <= 0) {
        return i;
      }
    }
  }
  return start;
}

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
      // Some languages have dedicated renderers, such as mermaid.
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

function firstHtmlTag(raw: string): string | null {
  const match = raw.match(/^\s*<([a-z][\w:-]*)\b/i);
  return match ? match[1].toLowerCase() : null;
}
