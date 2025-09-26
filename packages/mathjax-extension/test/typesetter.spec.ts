// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { MathJaxTypesetter } from '@jupyterlab/mathjax-extension';

describe('@jupyterlab/mathjax-extension', () => {
  describe('MathJaxTypesetter', () => {
    let typesetter: MathJaxTypesetter;
    beforeEach(() => {
      typesetter = new MathJaxTypesetter();
    });
    describe('.typeset()', () => {
      it('should typeset inline equations', async () => {
        const host = document.createElement('div');
        host.innerHTML = '$1 + 1$';
        document.body.appendChild(host);
        await typesetter.typeset(host);
        expect(host.innerHTML).toContain('<mn>1</mn><mo>+</mo><mn>1</mn>');
      });

      it('should typeset block equations', async () => {
        const host = document.createElement('div');
        host.innerHTML = '$$1 + 1$$';
        document.body.appendChild(host);
        await typesetter.typeset(host);
        expect(host.innerHTML).toContain('<mn>1</mn><mo>+</mo><mn>1</mn>');
      });

      it.each([
        '$$\\href{https://jupyter.org}{1}$$',
        '$\\href{https://jupyter.org}{1}$'
      ])('should harden remote URLs in links', async input => {
        const host = document.createElement('div');
        host.innerHTML = input;
        document.body.appendChild(host);
        await typesetter.typeset(host);
        expect(host.innerHTML).toContain(
          '<a href="https://jupyter.org" rel="noopener" target="_blank">'
        );
      });

      it.each([
        '<a href="#section-in-notebook" target="_self">link</a>',
        '<a href="./picture.png">link</a>'
      ])('should not modify pre-existing URLs', async input => {
        const host = document.createElement('div');
        host.innerHTML = input;
        document.body.appendChild(host);
        await typesetter.typeset(host);
        expect(host.innerHTML).toContain(input);
      });
    });
  });
});
