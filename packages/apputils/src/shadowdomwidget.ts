// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Widget } from '@lumino/widgets';

/**
 * Cache of constructable CSSStyleSheet copies, keyed by package name.
 * Shared across all shadow roots so each sheet is created only once.
 */
const _packageSheets = new Map<string, CSSStyleSheet[]>();

/**
 * Get constructable CSSStyleSheets for a given package name.
 *
 * Looks for all `<style data-package="NAME">` elements in the
 * document (injected by style-loader with css-package-loader tagging),
 * creates constructable CSSStyleSheets from their text content,
 * and caches them for reuse across shadow roots.
 */
function getPackageStyleSheets(packageName: string): CSSStyleSheet[] {
  const cached = _packageSheets.get(packageName);
  if (cached) {
    return cached;
  }

  const styles = document.querySelectorAll(
    `style[data-package="${CSS.escape(packageName)}"]`
  );
  const sheets: CSSStyleSheet[] = [];
  for (const style of styles) {
    if (style.textContent) {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(style.textContent);
      sheets.push(sheet);
    }
  }
  if (sheets.length > 0) {
    _packageSheets.set(packageName, sheets);
  }
  return sheets;
}

/**
 * A widget backed by a shadow DOM root.
 */
export class ShadowDOMWidget extends Widget {
  /**
   * Global default for shadow DOM isolation.
   * Can be set by application configuration before widgets are created.
   * Individual widgets can override via the `shadowEnabled` constructor option.
   */
  static shadowEnabled = false;

  /**
   * Construct a new shadow DOM widget.
   */
  constructor(options: ShadowDOMWidget.IOptions = {}) {
    super(options);
    this._shadowEnabled =
      options.shadowEnabled ?? ShadowDOMWidget.shadowEnabled;
    if (this._shadowEnabled) {
      const attachmentNode = document.createElement('div');
      attachmentNode.classList.add('lm-attachmentNode');
      this._root = attachmentNode.attachShadow({ mode: 'open' });
      this._root.appendChild(this.node);
      this.attachmentNode = attachmentNode;
      if (options.cssDeps) {
        this.adoptPackageStyles(options.cssDeps);
      }
    } else {
      this.attachmentNode = this.node;
    }
  }

  /**
   * Whether shadow DOM isolation is enabled for this widget.
   */
  get shadowEnabled(): boolean {
    return this._shadowEnabled;
  }

  /**
   * Get the node which should be attached to the parent in order to attach the widget.
   *
   * When shadow DOM is enabled, this is a wrapper element whose shadow root
   * contains the real widget node. Otherwise, it is the widget node itself.
   */
  readonly attachmentNode: HTMLElement;

  /**
   * Adopt a stylesheet in the shadow root.
   *
   * Returns `true` if the sheet was added and `false` if already present.
   * No-op when shadow DOM is not enabled.
   */
  adoptStyleSheet(sheet: CSSStyleSheet): boolean {
    if (!this._root) {
      return false;
    }
    if (this._root.adoptedStyleSheets.indexOf(sheet) !== -1) {
      return false;
    }
    this._root.adoptedStyleSheets = [...this._root.adoptedStyleSheets, sheet];
    return true;
  }

  /**
   * Adopt stylesheets for the given packages into this shadow root.
   *
   * @param packages - Array of package names (e.g. from a generated
   *   `cssDeps.json`). For each package, a `<style data-package="NAME">`
   *   element is looked up in the document, converted to a constructable
   *   CSSStyleSheet (cached), and adopted into this widget's shadow root.
   *
   * No-op when shadow DOM is not enabled.
   */
  adoptPackageStyles(packages: readonly string[]): void {
    if (!this._root) {
      return;
    }
    for (const pkg of packages) {
      for (const sheet of getPackageStyleSheets(pkg)) {
        this.adoptStyleSheet(sheet);
      }
    }
  }

  /**
   * Remove a previously adopted stylesheet from the shadow root.
   *
   * Returns `true` if the sheet was removed and `false` otherwise.
   * No-op when shadow DOM is not enabled.
   */
  removeAdoptedStyleSheet(sheet: CSSStyleSheet): boolean {
    if (!this._root) {
      return false;
    }
    if (this._root.adoptedStyleSheets.indexOf(sheet) === -1) {
      return false;
    }
    this._root.adoptedStyleSheets = this._root.adoptedStyleSheets.filter(
      adopted => adopted !== sheet
    );
    return true;
  }

  private _shadowEnabled: boolean;
  private _root: ShadowRoot | null = null;
}

export namespace ShadowDOMWidget {
  export interface IOptions extends Widget.IOptions {
    /**
     * Whether to enable shadow DOM isolation for this widget.
     * Defaults to `false`.
     */
    shadowEnabled?: boolean;

    /**
     * Package names whose stylesheets should be adopted into the
     * shadow root at construction time (e.g. from a generated
     * `cssDeps.json`). Only used when `shadowEnabled` is `true`.
     */
    cssDeps?: readonly string[];
  }
}
