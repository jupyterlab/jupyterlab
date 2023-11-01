/*
 * Copyright (c) Jupyter Development Team.
 * Distributed under the terms of the Modified BSD License.
 */

import {
  MERMAID_MIME_TYPE,
  MermaidManager,
  RenderedMermaid
} from '@jupyterlab/mermaid';

import type { ParseOptions, RenderResult } from 'mermaid';

export const GOOD_MERMAID = `
flowchart LR
    chicken --> egg --> chicken
`;

export const FAIL = 'FAIL';

export const BAD_MERMAID = `
flowchart LR
    ${FAIL} -->
`;

export const SVG_DATA_ATTR = 'data.image/svg+xml';
export const MERMAID_VERSION_ATTR = ['metadata', 'text/vnd.mermaid', 'version'];

/**
 * A mock mermaid that provides the minimal renderer API.
 *
 * This is needed because `jsdom` cannot handle text measurement.
 *
 * @see https://github.com/mermaid-js/mermaid/issues/559
 */
class MockMermaid {
  async render(
    id: string,
    text: string,
    container: Element | undefined
  ): Promise<RenderResult> {
    if (text.includes(FAIL)) {
      throw new Error('Intentionally failed');
    }
    return {
      svg: '<svg></svg>'
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
class MockMermaidManager extends MermaidManager {
  /**
   * Shim the real mermaid.
   */
  async getMermaid() {
    return new MockMermaid() as any;
  }

  /**
   * Shim the version
   */
  getMermaidVersion(): string | null {
    return 'x.x.x';
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
