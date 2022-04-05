// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { TableOfContents } from '../tokens';

export const NUMBERING_CLASS = 'numbering-entry';

/**
 * Returns whether a MIME type corresponds to either HTML.
 *
 * @param mime - MIME type string
 * @returns boolean indicating whether a provided MIME type corresponds to either HTML
 *
 * @example
 * const bool = isHTML('text/html');
 * // returns true
 *
 * @example
 * const bool = isHTML('text/plain');
 * // returns false
 */
export function isHTML(mime: string): boolean {
  return mime === 'text/html';
}

export function getHTMLHeadings(
  html: string,
  options?: Partial<TableOfContents.IConfig>,
  initialLevels: number[] = []
): TableOfContents.IHeading[] {
  const { numberingH1, maximalDepth } = {
    ...TableOfContents.defaultConfig,
    ...options
  };

  const container = document.createElement('div');
  container.innerHTML = html;

  const levels = initialLevels;
  let previousLevel = levels.length;
  const headings = new Array<TableOfContents.IHeading>();
  const headers = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
  for (const h of headers) {
    // TODO support tocSkip class from toc2
    if (h.classList.contains('jp-toc-ignore')) {
      // skip this element if a special class name is included
      continue;
    }
    let level = parseInt(h.tagName[1], 10);
    if (!numberingH1) {
      level -= 1;
    }

    if (level > 0 && level <= maximalDepth) {
      if (level > previousLevel) {
        // Initialize the new level
        levels[level - 1] = 1;
      } else {
        // Increment the current level
        levels[level - 1] += 1;

        // Drop higher levels
        if (level < previousLevel) {
          levels.splice(level);
        }
      }
      previousLevel = level;

      headings.push({
        text: h.textContent ?? '',
        // If the header list skips some level, replace missing elements by 0
        prefix: levels.map(level => level ?? 0).join('.') + '.',
        level
      });
    }
  }
  return headings;
}
