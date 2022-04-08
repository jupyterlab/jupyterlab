// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { TableOfContents } from '../tokens';

/**
 * Class used to mark numbering prefix for headings in a document.
 */
export const NUMBERING_CLASS = 'numbering-entry';

/**
 * HTML heading
 */
export interface IHTMLHeading extends TableOfContents.IHeading {
  /**
   * HTML id
   */
  id?: string | null;
}

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

/**
 * Parse a HTML string for headings.
 *
 * @param html HTML string to parse
 * @param options Options
 * @param initialLevels Initial levels for prefix computation
 * @returns Extracted headings
 */
export function getHTMLHeadings(
  html: string,
  options?: Partial<TableOfContents.IConfig>,
  initialLevels: number[] = []
): IHTMLHeading[] {
  const { numberingH1, numberHeaders, maximalDepth } = {
    ...TableOfContents.defaultConfig,
    ...options
  };

  const container: HTMLDivElement = document.createElement('div');
  container.innerHTML = html;

  const levels = initialLevels;
  let previousLevel = levels.length;
  const headings = new Array<IHTMLHeading>();
  const headers = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
  for (const h of headers) {
    // TODO support tocSkip class from toc2
    if (h.classList.contains('jp-toc-ignore')) {
      // skip this element if a special class name is included
      continue;
    }
    let level = parseInt(h.tagName[1], 10);

    if (level > 0 && level <= maximalDepth) {
      let prefix = '';
      if (numberHeaders) {
        if (level > previousLevel) {
          // Initialize the new levels
          for (let l = previousLevel; l < level - 1; l++) {
            levels[l] = 0;
          }
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

        // If the header list skips some level, replace missing elements by 0
        if (numberingH1) {
          prefix = levels.map(level => level ?? 0).join('.') + '. ';
        } else {
          if (levels.length > 1) {
            prefix =
              levels
                .slice(1)
                .map(level => level ?? 0)
                .join('.') + '. ';
          }
        }
      }

      headings.push({
        text: h.textContent ?? '',
        prefix,
        level,
        id: h?.getAttribute('id')
      });
    }
  }
  return headings;
}

export function addPrefix(
  container: Element,
  selector: string,
  prefix: string
): Element | null {
  let element = container.querySelector(selector) as Element | null;

  if (!element) {
    return null;
  }

  if (!element.querySelector(`span.${NUMBERING_CLASS}`)) {
    addNumbering(element, prefix);
  } else {
    // There are likely multiple elements with the same selector
    //  => use the first one without prefix
    const allElements = container.querySelectorAll(selector);
    for (const el of allElements) {
      if (!el.querySelector(`span.${NUMBERING_CLASS}`)) {
        element = el;
        addNumbering(el, prefix);
        break;
      }
    }
  }

  return element;
}

/**
 * Add a numbering prefix to a HTML element.
 *
 * @param el HTML element
 * @param numbering Numbering prefix to add
 */
function addNumbering(el: Element, numbering: string): void {
  el.insertAdjacentHTML(
    'afterbegin',
    `<span class="${NUMBERING_CLASS}">${numbering}</span>`
  );
}

/**
 * Remove all numbering nodes from element
 * @param element Node to clear
 */
export function clearNumbering(element: Element): void {
  element.querySelectorAll(`span.${NUMBERING_CLASS}`).forEach(el => {
    el.remove();
  });
}
