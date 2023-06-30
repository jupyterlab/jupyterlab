// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type MermaidType from 'mermaid';

import { PromiseDelegate } from '@lumino/coreutils';

import { LruCache } from '@jupyterlab/coreutils';

import { IThemeManager } from '@jupyterlab/apputils';

import {
  DETAILS_CLASS,
  IMermaidManager,
  MERMAID_CLASS,
  MERMAID_DARK_THEME,
  MERMAID_DEFAULT_THEME,
  SUMMARY_CLASS,
  WARNING_CLASS
} from './tokens';

/**
 * A mermaid diagram manager with cache.
 */
export class MermaidManager implements IMermaidManager {
  protected _diagrams: LruCache<string, HTMLElement>;
  protected _themes: IThemeManager | null;

  constructor(options: MermaidManager.IOptions = {}) {
    this._diagrams = new LruCache({ maxSize: options.maxCacheSize || null });

    // handle reacting to themes
    if (options.themes) {
      Private.initThemes(options.themes || null);
      options.themes.themeChanged.connect(this.initialize, this);
    }
  }

  /**
   * Handle (re)-initializing mermaid based on external values.
   */
  initialize() {
    this._diagrams.clear();
    Private.initMermaid();
  }

  /**
   * Get the underlying, potentially un-initialized mermaid module.
   */
  async getMermaid(): Promise<typeof MermaidType> {
    return await Private.ensureMermaid();
  }

  /**
   * Get the version of the currently-loaded mermaid module
   */
  getMermaidVersion(): string | null {
    return Private.version();
  }

  /**
   * Get a pre-cached mermaid figure.
   *
   * This primarily exists for the needs of `marked`, which supports async node
   * visitors, but not async rendering.
   */
  getCachedFigure(text: string): HTMLElement | null {
    return this._diagrams.get(text);
  }

  /**
   * Attempt a raw rendering of mermaid to an SVG string.
   */
  async renderSvg(text: string): Promise<string> {
    const _mermaid = await this.getMermaid();

    const id = `jp-mermaid-${Private.nextMermaidId()}`;

    // create temporary element into which to render
    const el = document.createElement('div');
    document.body.appendChild(el);

    try {
      const { svg } = await _mermaid.render(id, text, el);
      return svg;
    } finally {
      el.remove();
    }
  }

  /**
   * Provide and cache a fully-rendered element, checking the cache first.
   */
  async renderFigure(text: string): Promise<HTMLElement> {
    // bail if already cached
    let output: HTMLElement | null = this._diagrams.get(text);

    if (output != null) {
      return output;
    }

    let className = MERMAID_CLASS;

    let result: HTMLElement | null = null;

    // the element that will be returned
    output = document.createElement('div');
    output.className = className;

    try {
      const svg = await this.renderSvg(text);
      result = this.makeMermaidFigure(svg);
    } catch (err) {
      output.classList.add(WARNING_CLASS);
      result = await this.makeMermaidError(text);
    }

    let version = this.getMermaidVersion();

    if (version) {
      result.dataset.jpMermaidVersion = version;
    }

    output.appendChild(result);

    // update the cache for use when rendering synchronously
    this._diagrams.set(text, output);

    return output;
  }

  /**
   * Get the parser message element from a failed parse.
   *
   * This doesn't do much of anything if the text is successfully parsed.
   */
  async makeMermaidError(text: string): Promise<HTMLElement> {
    const _mermaid = await this.getMermaid();
    let errorMessage = '';
    try {
      await _mermaid.parse(text);
    } catch (err) {
      errorMessage = `${err}`;
    }

    const result = document.createElement('details');
    result.className = DETAILS_CLASS;
    const summary = document.createElement('summary');
    summary.className = SUMMARY_CLASS;
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.innerText = text;
    pre.appendChild(code);
    summary.appendChild(pre);
    result.appendChild(summary);

    const warning = document.createElement('pre');
    warning.innerText = errorMessage;
    result.appendChild(warning);
    return result;
  }

  /**
   * Extract extra attributes to add to a generated figure.
   */
  makeMermaidFigure(svg: string): HTMLElement {
    const figure = document.createElement('figure');
    const img = document.createElement('img');

    figure.appendChild(img);
    img.setAttribute('src', `data:image/svg+xml,${encodeURIComponent(svg)}`);

    // add dimension information
    const maxWidth = svg.match(/max-width: (\d+)/);
    if (maxWidth && maxWidth[1]) {
      const width = parseInt(maxWidth[1]);
      if (width && !Number.isNaN(width) && Number.isFinite(width)) {
        img.width = width;
      }
    }

    // add accessible alt title
    const title = svg.match(/<title[^>]*>([^<]+)<\/title>/);
    if (title && title[1]) {
      img.setAttribute('alt', title[1]);
    }

    // add accessible caption
    const desc = svg.match(/<desc[^>]*>([^<]+)<\/desc>/s);
    if (desc && desc[1]) {
      const caption = document.createElement('figcaption');
      caption.className = 'sr-only';
      caption.textContent = desc[1];
      figure.appendChild(caption);
    }

    return figure;
  }
}

/**
 * A namespace for implementation-specific details of this mermaid manager.
 */
export namespace MermaidManager {
  /**
   * Initialization options for the mermaid manager.
   */
  export interface IOptions {
    maxCacheSize?: number | null;
    themes?: IThemeManager | null;
  }
}

/**
 * A namespace for global, private mermaid data.
 */
namespace Private {
  let _themes: IThemeManager | null = null;
  let _mermaid: typeof MermaidType | null = null;
  let _loading: PromiseDelegate<typeof MermaidType> | null = null;
  let _nextMermaidId = 0;
  let _version: string | null = null;

  /**
   * Cache a reference to the theme manager.
   */
  export function initThemes(themes: IThemeManager | null) {
    _themes = themes;
  }

  /**
   * Get the version of mermaid used for rendering.
   */
  export function version(): string | null {
    return _version;
  }

  /**
   * (Re-)initialize mermaid with lab-specific theme information
   */
  export function initMermaid(): boolean {
    if (!_mermaid) {
      return false;
    }

    let theme = MERMAID_DEFAULT_THEME;

    if (_themes) {
      const jpTheme = _themes.theme;
      theme =
        jpTheme && _themes.isLight(jpTheme)
          ? MERMAID_DEFAULT_THEME
          : MERMAID_DARK_THEME;
    }

    const fontFamily = window
      .getComputedStyle(document.body)
      .getPropertyValue('--jp-ui-font-family');

    _mermaid.mermaidAPI.globalReset();
    _mermaid.mermaidAPI.initialize({
      theme,
      fontFamily,
      maxTextSize: 100000,
      startOnLoad: false
    });
    return true;
  }

  /**
   * Determine whether mermaid has been loaded yet.
   */
  export function getMermaid(): typeof MermaidType | null {
    return _mermaid;
  }

  /**
   * Provide a globally-unique, but unstable, ID for disambiguation.
   */
  export function nextMermaidId() {
    return _nextMermaidId++;
  }

  /**
   * Ensure mermaid has been lazily loaded once, initialized, and cached.
   */
  export async function ensureMermaid(): Promise<typeof MermaidType> {
    if (_mermaid != null) {
      return _mermaid;
    }
    if (_loading) {
      return _loading.promise;
    }
    _loading = new PromiseDelegate();
    _version = (await import('mermaid/package.json')).version;
    _mermaid = (await import('mermaid')).default;
    initMermaid();
    _loading.resolve(_mermaid);
    return _mermaid;
  }
}
