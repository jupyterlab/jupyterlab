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
        expect(host.querySelector('mjx-assistive-mml math')?.textContent).toBe(
          '1+1'
        );
      });

      it('should use the bundled TeX font', async () => {
        const host = document.createElement('div');
        host.textContent = '$x$';
        document.body.appendChild(host);
        await typesetter.typeset(host);
        expect(
          host.querySelector('mjx-math')?.classList.contains('TEX-N')
        ).toBe(true);
      });

      it('should typeset concurrent requests sharing a document', async () => {
        const hosts = ['1', '2', '3'].map(value => {
          const host = document.createElement('div');
          host.textContent = `$${value}$`;
          document.body.appendChild(host);
          return host;
        });
        await Promise.all(
          hosts.map(host => new MathJaxTypesetter().typeset(host))
        );
        expect(
          hosts.map(
            host => host.querySelector('mjx-assistive-mml math')?.textContent
          )
        ).toEqual(['1', '2', '3']);
      });

      it('should typeset concurrent requests with different delimiters', async () => {
        const other = new MathJaxTypesetter({ dollarInlineMath: false });
        const hosts = Array.from({ length: 6 }, (_, index) => {
          const host = document.createElement('div');
          host.textContent =
            index % 2 === 0
              ? `$\\require{physics}\\bra{${index}}$`
              : `\\(\\require{physics}\\bra{${index}}\\)`;
          document.body.appendChild(host);
          return host;
        });
        await Promise.all(
          hosts.map((host, index) =>
            (index % 2 === 0 ? typesetter : other).typeset(host)
          )
        );
        expect(
          hosts.map(
            host => host.querySelector('mjx-assistive-mml math')?.textContent
          )
        ).toEqual(['⟨0|', '⟨1|', '⟨2|', '⟨3|', '⟨4|', '⟨5|']);
      });

      it('should recover after a rendering failure', async () => {
        const host = document.createElement('div');
        host.textContent = '$1$';
        document.body.appendChild(host);
        const mathDocument = await typesetter.mathDocument();
        const render = jest
          .spyOn(mathDocument, 'renderPromise')
          .mockRejectedValueOnce(new Error('Rendering failed'));
        try {
          await expect(typesetter.typeset(host)).rejects.toThrow(
            'Rendering failed'
          );
          expect(mathDocument.options.elements).toBeUndefined();
          await typesetter.typeset(host);
          expect(
            host.querySelector('mjx-assistive-mml math')?.textContent
          ).toBe('1');
        } finally {
          render.mockRestore();
        }
      });

      it('should load a bundled optional TeX package with require', async () => {
        const host = document.createElement('div');
        host.textContent = '$\\require{physics}\\bra{x}$';
        document.body.appendChild(host);
        await typesetter.typeset(host);
        expect(host.querySelector('mjx-container')).not.toBeNull();
        expect(host.querySelector('[data-mjx-error], merror')).toBeNull();
        expect(host.querySelector('mjx-assistive-mml math')?.textContent).toBe(
          '⟨x|'
        );
      });

      it('should share output styles across delimiter configurations', async () => {
        const other = new MathJaxTypesetter({ dollarInlineMath: false });

        for (const [renderer, source] of [
          [typesetter, '$U$'],
          [other, '\\(V\\)'],
          [typesetter, '$W$']
        ] as const) {
          const host = document.createElement('div');
          host.textContent = source;
          document.body.appendChild(host);
          await renderer.typeset(host);
        }
        const style =
          document.querySelector<HTMLStyleElement>('#MJX-CHTML-styles');
        const rules = Array.from(
          style?.sheet?.cssRules ?? [],
          rule => rule.cssText
        ).join('');
        expect(rules).toContain('mjx-c1D448');
        expect(rules).toContain('mjx-c1D449');
        expect(rules).toContain('mjx-c1D44A');
      });

      it('should typeset block equations', async () => {
        const host = document.createElement('div');
        host.innerHTML = '$$1 + 1$$';
        document.body.appendChild(host);
        await typesetter.typeset(host);
        expect(host.querySelector('mjx-assistive-mml math')?.textContent).toBe(
          '1+1'
        );
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
        expect(host.querySelector('mjx-container')).toBeNull();
      });

      it('should still typeset `\\(...\\)` when dollar inline math is disabled', async () => {
        const configured = new MathJaxTypesetter({ dollarInlineMath: false });
        const host = document.createElement('div');
        host.innerHTML = '\\(1 + 1\\)';
        document.body.appendChild(host);
        await configured.typeset(host);
        expect(host.querySelector('mjx-assistive-mml math')?.textContent).toBe(
          '1+1'
        );
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
        expect(host.querySelector('mjx-container')).toBeNull();
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
