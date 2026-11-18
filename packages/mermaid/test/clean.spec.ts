// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { MermaidManager } from '@jupyterlab/mermaid';

import {
  makeElementVariants,
  SVG_MIME,
  SVG_XHTML_FOOTER,
  SVG_XHTML_HEADER,
  VOID_ELEMENTS
} from './utils';

const parser = new DOMParser();

describe('@jupyterlab/mermaid', () => {
  for (const element of VOID_ELEMENTS) {
    it(`should clean void element ${element}`, () => {
      const variants = makeElementVariants(element);
      const raw = [...SVG_XHTML_HEADER, ...variants, ...SVG_XHTML_FOOTER].join(
        '\n'
      );

      const clean = MermaidManager.cleanMermaidSvg(raw);
      const parsed = parser.parseFromString(clean, SVG_MIME);
      const { numberValue } = parsed.evaluate(
        `count(//${element})`,
        parsed,
        null,
        XPathResult.NUMBER_TYPE,
        null
      );
      expect(numberValue).toBe(variants.length);
    });
  }

  it('should accept non-breaking spaces', () => {
    const raw = [...SVG_XHTML_HEADER, '&nbsp;', ...SVG_XHTML_FOOTER].join('\n');
    const clean = MermaidManager.cleanMermaidSvg(raw);
    parser.parseFromString(clean, SVG_MIME);
    expect(clean).toContain('"&#160;"');
  });
});
