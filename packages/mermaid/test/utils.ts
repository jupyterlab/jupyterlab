// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import type { IThemeManager } from '@jupyterlab/apputils';
import type { IChangedArgs } from '@jupyterlab/coreutils';
import { type ISignal, Signal } from '@lumino/signaling';
import type MermaidType from 'mermaid';
import type { ParseOptions, RenderResult } from 'mermaid';

import {
  MERMAID_MIME_TYPE,
  MermaidManager,
  RenderedMermaid
} from '@jupyterlab/mermaid';

export const GOOD_MERMAID = `
flowchart LR
    chicken --> egg --> chicken
`;

export const FAIL = 'FAIL';

export const BAD_MERMAID = `
flowchart LR
    ${FAIL} -->
`;

export const SVG_MIME = 'image/svg+xml';
export const SVG_DATA_ATTR = `data.${SVG_MIME}`;
export const MERMAID_VERSION_ATTR = ['metadata', 'text/vnd.mermaid', 'version'];

export const VOID_ELEMENTS = [
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr'
];

export const SVG_XHTML_HEADER = [
  '<svg xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg">',
  '<foreignObject>',
  '<div xmlns="http://www.w3.org/1999/xhtml">'
];

export const SVG_XHTML_FOOTER = ['</div>', '</foreignObject>', '</svg>'];

/**
 * A mock mermaid that provides the minimal renderer API.
 *
 * This is needed because `jsdom` cannot handle text measurement.
 *
 * @see https://github.com/mermaid-js/mermaid/issues/559
 */
export class MockMermaid {
  currentTheme = 'default';

  initialize(config: { theme?: string }): void {
    if (config?.theme) {
      this.currentTheme = config.theme;
    }
  }

  async render(
    id: string,
    text: string,
    container: Element | undefined
  ): Promise<RenderResult> {
    if (text.includes(FAIL)) {
      throw new Error('Intentionally failed');
    }
    return {
      svg: `<svg data-theme="${this.currentTheme}"></svg>`,
      diagramType: 'mock-diagram'
    };
  }

  async parse(
    text: string,
    parseOptions?: ParseOptions | undefined
  ): Promise<boolean | void> {
    if (text.includes(FAIL)) {
      throw new Error('Intentionally failed');
    }
    return true;
  }
}

/**
 * A mock manager that overloads the mermaid.
 */
export class MockMermaidManager extends MermaidManager {
  readonly mockMermaid = new MockMermaid();

  /**
   * Shim the real mermaid.
   */
  async getMermaid(): Promise<typeof MermaidType> {
    return this.mockMermaid as unknown as typeof MermaidType;
  }

  /**
   * Shim the version
   */
  getMermaidVersion(): string | null {
    return 'x.x.x';
  }

  initialize(sender?: unknown, args?: unknown): void {
    if (this._themes) {
      const jpTheme = this._themes.theme;
      this.mockMermaid.currentTheme =
        jpTheme && this._themes.isLight(jpTheme) ? 'default' : 'dark';
    }
    super.initialize(sender, args);
  }
}

export class MockThemeManager {
  private _theme: string = 'JupyterLab Light';
  private _themeChanged = new Signal<
    IThemeManager,
    IChangedArgs<string, string | null>
  >(this as unknown as IThemeManager);

  get theme(): string {
    return this._theme;
  }

  async setTheme(theme: string): Promise<void> {
    const oldValue = this._theme;
    this._theme = theme;
    this._themeChanged.emit({
      name: 'theme',
      oldValue,
      newValue: theme
    });
  }

  get themeChanged(): ISignal<
    IThemeManager,
    IChangedArgs<string, string | null>
  > {
    return this._themeChanged;
  }

  isLight(theme: string): boolean {
    return !theme.toLowerCase().includes('dark');
  }

  asThemeManager(): IThemeManager {
    return this as unknown as IThemeManager;
  }
}

export const MERMAID_MANAGER = new MockMermaidManager();
RenderedMermaid.manager = MERMAID_MANAGER;

export const MERMAID_RENDERER = new RenderedMermaid({
  latexTypesetter: null,
  linkHandler: null,
  mimeType: MERMAID_MIME_TYPE,
  resolver: null,
  sanitizer: {
    sanitize: (s: string) => s
  }
});

export function makeElementVariants(element: string) {
  return [
    `<${element}>`,
    `<${element}>`,
    `<${element} >`,
    `<${element} />`,
    `<${element} / >`,
    `<  ${element}  /  >`,
    `<${element} id="a" >`,
    `<${element} id="b" >`,
    `<${element} id="c"/>`,
    `<${element} id="d" />`,
    `<${element} id="e" / >`,
    `<  ${element} id="f"  /  >`
  ];
}
