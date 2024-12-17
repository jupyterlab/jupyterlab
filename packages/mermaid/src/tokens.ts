// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Token } from '@lumino/coreutils';
import type MermaidType from 'mermaid';
import type { MermaidConfig } from 'mermaid/dist/config.type';

// documented upstream constants
export const MERMAID_MIME_TYPE = 'text/vnd.mermaid';
export const MERMAID_FILE_EXTENSIONS = ['.mmd', '.mermaid'];

// layout sniffing
export const RE_DEFAULT_RENDERER =
  /\bdefaultRenderer["']?\s*:\s*(["']?)(\b[^"'\s]+\b)(\1)/gm;

// mermaid themes
export const MERMAID_DEFAULT_THEME: MermaidConfig['theme'] = 'default';
export const MERMAID_DARK_THEME: MermaidConfig['theme'] = 'dark';

// DOM
export const MERMAID_CLASS = 'jp-RenderedMermaid';
export const MERMAID_CODE_CLASS = 'mermaid';
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
   * Get the (potentially uninitialized) mermaid module.
   */
  getMermaid(): Promise<typeof MermaidType>;

  /**
   * Get the version of the currently-loaded mermaid module
   */
  getMermaidVersion(): string | null;

  /**
   * Render mermaid source to an SVG string with extracted metadata.
   */
  renderSvg(text: string): Promise<IMermaidManager.IRenderInfo>;

  /**
   * Render and cache mermaid source as a figure of an image, or a unsuccessful parser message.
   */
  renderFigure(text: string): Promise<HTMLElement>;

  /**
   * Get the pre-cached element for a mermaid string, if available.
   */
  getCachedFigure(text: string): HTMLElement | null;
}

/**
 * A namespace for the mermaid manager.
 */
export namespace IMermaidManager {
  /**
   * The results of a successful rendering of a mermaid text-based diagram.
   */
  export interface IRenderInfo {
    /** the original source of the diagram. */
    text: string;
    /** The raw rendered SVG. */
    svg: string;
    /** The extracted accessible description, if found. */
    accessibleDescription?: string | null;
    /** The extracted accessible title, if found. */
    accessibleTitle?: string | null;
    /** The extracted width of the digaram, if found. */
    width?: number | null;
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
