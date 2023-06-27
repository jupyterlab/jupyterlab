// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Token } from '@lumino/coreutils';

// documented upstream constants
export const MIME_TYPE = 'text/vnd.mermaid';
export const EXTENSIONS = ['.mmd', '.mermaid'];

// mermaid themes
export const DEFAULT_THEME = 'default';
export const DARK_THEME = 'dark';

// DOM
export const MERMAID_CLASS = 'jp-RenderedMermaid';
export const WARNING_CLASS = 'jp-mod-warning';
export const DETAILS_CLASS = 'jp-RenderedMermaid-Details';
export const SUMMARY_CLASS = 'jp-RenderedMermaid-Summary';

/**
 * The exported token for a mermaid manager
 */
export const IMermaidManager = new Token<IMermaidManager>(
  '@jupyterlab/mermaid:IMermaidManager',
  `a manager for rendering mermaid text-based diagrams`
);

/**
 * A namespace for public mermaid interfaces.
 */
export interface IMermaidManager {
  /**
   * Render mermaid source to an SVG string.
   */
  renderSvg(
    text: string,
    options?: IMermaidManager.IRenderOptions
  ): Promise<string>;

  /**
   * Render and cache mermaid source as a figure of an image, or a unsuccessful parser message.
   */
  renderFigure(
    text: string,
    options?: IMermaidManager.IRenderOptions
  ): Promise<HTMLElement>;

  /**
   * Get the pre-cached element for a mermaid string, if available.
   */
  getCachedFigure(text: string): HTMLElement | null;
}

/**
 * A namespace for mermaid interfaces
 */
export namespace IMermaidManager {
  export interface IRenderOptions {
    theme?: string;
  }
}

/**
 * The exported token for a mermaid manager
 */
export const IMermaidMarkdown = new Token<IMermaidMarkdown>(
  '@jupyterlab/mermaid:IMermaidMarkdown',
  `a manager for rendering mermaid text-based diagrams in markdown fenced code blocks`
);

/**
 * A handler for mermaid fenced code blocks in markdown
 *
 * This duplicates the (currently) private `IFencedBlockRenderer` in
 * `@jupyterlab/markedparser-extension`.
 */
export interface IMermaidMarkdown {
  /**
   * The languages this block accepts.
   */
  languages: string[];
  /**
   * The order in which the block would be processed
   */
  rank: number;
  /**
   * Handle up-front loading/parsing mermaid
   */
  walk: (text: string) => Promise<void>;
  /**
   * Provide pre-rendered diagram content
   */
  render: (text: string) => string | null;
}
