// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { HTMLSearchEngine } from '@jupyterlab/documentsearch';
import { MathJaxTypesetter } from '@jupyterlab/mathjax-extension';

/**
 * Search in formulas typeset by the real MathJax typesetter, which puts each
 * character in its own text node and draws letters as mathematical symbols.
 */
describe('@jupyterlab/documentsearch', () => {
  describe('HTMLSearchEngine', () => {
    describe('#search()', () => {
      it.each([
        [/10/g, ['10']],
        // MathJax draws the minus sign as U+2212
        [/x-10/g, ['𝑥\u221210']],
        [/x/gi, ['𝑥', '𝑥']],
        [/\bsin\b/g, ['sin']]
      ])(
        'should find %s in formulas typeset by MathJax',
        async (query, expected) => {
          const host = document.createElement('div');
          host.textContent = 'Value $x - 10$ and $\\sin x$.';
          document.body.appendChild(host);
          await new MathJaxTypesetter().typeset(host);
          const matches = await HTMLSearchEngine.search(query, host);
          expect(matches.map(match => match.text)).toEqual(expected);
          host.remove();
        }
      );

      it.each([
        [/\./g, ['…']],
        [/a/gi, ['Ａ', 'Ａ']]
      ])(
        'should cover each character of a formula once for %s',
        async (query, expected) => {
          const host = document.createElement('div');
          host.textContent = '$1, \\ldots, n$ $\\text{ＡＡ}$';
          document.body.appendChild(host);
          await new MathJaxTypesetter().typeset(host);
          const matches = await HTMLSearchEngine.search(query, host);
          expect(matches.map(match => match.text)).toEqual(expected);
          host.remove();
        }
      );
    });
  });
});
