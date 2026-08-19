// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { MathJaxTypesetter } from '@jupyterlab/mathjax-extension';

describe('@jupyterlab/mathjax-extension', () => {
  describe('MathJaxTypesetter', () => {
    let typesetter: MathJaxTypesetter;
    beforeEach(() => {
      typesetter = new MathJaxTypesetter();
    });
    describe('#typeset()', () => {
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
        'Hello $24 and $27',
        'Prices are $20,000 and $30,000',
        'The cost is $1,239.50'
      ])(
        'should leave currency amounts containing `$` literal: %s',
        async input => {
          const host = document.createElement('div');
          host.innerHTML = input;
          document.body.appendChild(host);
          await typesetter.typeset(host);
          expect(host.innerHTML).toContain(input);
          expect(host.innerHTML).not.toContain('<mn>2</mn>');
        }
      );

      it('should leave a `$` followed by whitespace literal', async () => {
        const host = document.createElement('div');
        host.innerHTML = 'Store $ and compute $x^2$';
        document.body.appendChild(host);
        await typesetter.typeset(host);
        expect(host.innerHTML).toContain('Store $ and compute ');
        expect(host.innerHTML).not.toContain('$x^2$');
        expect(host.innerHTML).toContain('mjx-container');
      });

      it('should not treat a `$` followed by a digit as closing math', async () => {
        const host = document.createElement('div');
        host.innerHTML = '$x^2$1 is not math';
        document.body.appendChild(host);
        await typesetter.typeset(host);
        expect(host.innerHTML).toContain('$x^2$1 is not math');
        expect(host.innerHTML).not.toContain('mjx-container');
      });

      it('should still typeset genuine inline math under the smart rules', async () => {
        const host = document.createElement('div');
        host.innerHTML = 'Euler stated $e^{i\\pi} + 1 = 0$ is beautiful.';
        document.body.appendChild(host);
        await typesetter.typeset(host);
        expect(host.innerHTML).toContain('<mn>1</mn>');
        expect(host.innerHTML).toContain('Euler stated');
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

    describe('#constructor()', () => {
      it('should treat `$` as inline math by default', () => {
        expect(new MathJaxTypesetter().mathParseOptions?.dollarInlineMath).toBe(
          true
        );
      });

      it('should enable smart inline math by default', () => {
        expect(new MathJaxTypesetter().mathParseOptions?.smartInlineMath).toBe(
          true
        );
      });

      it('should disable smart inline math when instructed', () => {
        expect(
          new MathJaxTypesetter({
            smartInlineMath: false
          }).mathParseOptions?.smartInlineMath
        ).toBe(false);
      });

      it('should report dollarInlineMath=false when `$` is not a delimiter', () => {
        const configured = new MathJaxTypesetter({ dollarInlineMath: false });
        expect(configured.mathParseOptions?.dollarInlineMath).toBe(false);
      });

      it('should not typeset `$...$` when dollar inline math is disabled', async () => {
        const configured = new MathJaxTypesetter({ dollarInlineMath: false });
        const host = document.createElement('div');
        host.innerHTML = '$1 + 1$';
        document.body.appendChild(host);
        await configured.typeset(host);
        expect(host.innerHTML).toContain('$1 + 1$');
        expect(host.innerHTML).not.toContain('<mn>1</mn>');
      });

      it('should still typeset `\\(...\\)` when dollar inline math is disabled', async () => {
        const configured = new MathJaxTypesetter({ dollarInlineMath: false });
        const host = document.createElement('div');
        host.innerHTML = '\\(1 + 1\\)';
        document.body.appendChild(host);
        await configured.typeset(host);
        expect(host.innerHTML).toContain('<mn>1</mn><mo>+</mo><mn>1</mn>');
      });
    });

    describe('#withParseOptions()', () => {
      it('should return a new typesetter with the given options', () => {
        const configured = typesetter.withParseOptions({
          dollarInlineMath: false
        });
        expect(configured).not.toBe(typesetter);
        expect(configured.mathParseOptions?.dollarInlineMath).toBe(false);
      });

      it('should leave the original typesetter unchanged', () => {
        typesetter.withParseOptions({ dollarInlineMath: false });
        expect(typesetter.mathParseOptions?.dollarInlineMath).toBe(true);
      });

      it('should inherit options which were not given', () => {
        const configured = new MathJaxTypesetter({
          dollarInlineMath: false
        }).withParseOptions({});
        expect(configured.mathParseOptions?.dollarInlineMath).toBe(false);
      });

      it('should inherit options which were given as `undefined`', () => {
        const configured = new MathJaxTypesetter({
          dollarInlineMath: false
        }).withParseOptions({ dollarInlineMath: undefined });
        expect(configured.mathParseOptions?.dollarInlineMath).toBe(false);
      });

      it('should not typeset `$...$` when dollar inline math is disabled', async () => {
        const configured = typesetter.withParseOptions({
          dollarInlineMath: false
        });
        const host = document.createElement('div');
        host.innerHTML = '$1 + 1$';
        document.body.appendChild(host);
        await configured.typeset(host);
        expect(host.innerHTML).toContain('$1 + 1$');
        expect(host.innerHTML).not.toContain('<mn>1</mn>');
      });
    });

    describe('#mathDocument()', () => {
      it('should share a MathDocument between typesetters with equal options', async () => {
        const a = new MathJaxTypesetter();
        const b = new MathJaxTypesetter({ dollarInlineMath: true });
        expect(await a.mathDocument()).toBe(await b.mathDocument());
      });

      it('should use a distinct MathDocument for distinct options', async () => {
        const a = new MathJaxTypesetter();
        const b = new MathJaxTypesetter({ dollarInlineMath: false });
        expect(await a.mathDocument()).not.toBe(await b.mathDocument());
      });
    });
  });
});
