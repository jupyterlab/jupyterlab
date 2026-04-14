// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Widget } from '@lumino/widgets';

/**
 * Cache of stylesheets extracted from the document.
 */
const _extractedSheets = new Map<string, CSSStyleSheet>();

/**
 * Extract a stylesheet from the document's `<style>` elements.
 *
 * Finds a `<style>` element whose text content contains the given
 * marker string (typically a unique CSS class like `.jp-Terminal`),
 * creates a constructable `CSSStyleSheet` from its content, caches it,
 * and removes the `<style>` element from the document.
 *
 * Subsequent calls with the same marker return the cached sheet.
 */
export function extractStyleSheet(
  marker: string,
  remove: boolean = true
): CSSStyleSheet | null {
  const cached = _extractedSheets.get(marker);
  if (cached) {
    return cached;
  }

  for (const style of document.querySelectorAll('style')) {
    const text = style.textContent;
    if (text && text.includes(marker)) {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(text);
      if (remove) {
        style.remove();
      }
      _extractedSheets.set(marker, sheet);
      return sheet;
    }
  }

  return null;
}

/**
 * A widget backed by a shadow DOM root.
 */
export class ShadowDOMWidget extends Widget {
  /**
   * Construct a new shadow DOM widget.
   */
  constructor(options: ShadowDOMWidget.IOptions = {}) {
    super(options);
    const attachmentNode = document.createElement('div');
    attachmentNode.classList.add('lm-attachmentNode');
    this._root = attachmentNode.attachShadow({ mode: 'open' });
    this._root.appendChild(this.node);
    this.attachmentNode = attachmentNode;
  }

  /**
   * Get the node which should be attached to the parent in order to attach the widget.
   */
  readonly attachmentNode: HTMLElement;

  /**
   * Adopt a stylesheet in the shadow root.
   *
   * Returns `true` if the sheet was added and `false` if already present.
   */
  adoptStyleSheet(sheet: CSSStyleSheet): boolean {
    if (this._root.adoptedStyleSheets.indexOf(sheet) !== -1) {
      return false;
    }
    this._root.adoptedStyleSheets = [...this._root.adoptedStyleSheets, sheet];
    return true;
  }

  /**
   * Remove a previously adopted stylesheet from the shadow root.
   *
   * Returns `true` if the sheet was removed and `false` otherwise.
   */
  removeAdoptedStyleSheet(sheet: CSSStyleSheet): boolean {
    if (this._root.adoptedStyleSheets.indexOf(sheet) === -1) {
      return false;
    }
    this._root.adoptedStyleSheets = this._root.adoptedStyleSheets.filter(
      adopted => adopted !== sheet
    );
    return true;
  }

  private _root: ShadowRoot;
}

export namespace ShadowDOMWidget {
  export interface IOptions extends Widget.IOptions {}
}
