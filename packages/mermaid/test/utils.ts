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
      svg: '<svg></svg>',
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
