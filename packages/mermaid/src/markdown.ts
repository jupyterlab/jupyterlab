// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IMermaidManager, IMermaidMarkdown } from './tokens';

/**
 * An implementation of mermaid fenced code blocks in markdown.
 */
export class MermaidMarkdown implements IMermaidMarkdown {
  protected _mermaid: IMermaidManager;
  readonly languages = ['mermaid'];
  readonly rank = 100;

  constructor(options: MermaidMarkdown.IOptions) {
    this._mermaid = options.mermaid;
  }

  /**
   * Pre-parse and cache the rendered text.
   */
  async walk(text: string): Promise<void> {
    await this._mermaid.renderFigure(text);
  }

  /**
   * Render the diagram.
   */
  render(text: string): string | null {
    // handle pre-cached mermaid figures
    let cachedFigure: HTMLElement | null = this._mermaid.getCachedFigure(text);
    if (cachedFigure) {
      return cachedFigure.outerHTML;
    }
    return null;
  }
}

/**
 * A namespace for mermaid markdown
 */
export namespace MermaidMarkdown {
  /**
   * Initialization options for mermaid markdown
   */
  export interface IOptions {
    mermaid: IMermaidManager;
  }
}
