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

    describe('hidden nodes', () => {
      /**
       * Stand-in for `IntersectionObserver` which records the callback so
       * the test can deliver visibility changes on demand.
       */
      class FakeIntersectionObserver implements IntersectionObserver {
        static instances: FakeIntersectionObserver[] = [];

        readonly root: Element | Document | null = null;
        readonly rootMargin = '';
        readonly thresholds: readonly number[] = [];

        private _callback: IntersectionObserverCallback;
        private _targets = new Set<Element>();

        constructor(callback: IntersectionObserverCallback) {
          this._callback = callback;
          FakeIntersectionObserver.instances.push(this);
        }

        observe(target: Element): void {
          this._targets.add(target);
        }

        unobserve(target: Element): void {
          this._targets.delete(target);
        }

        disconnect(): void {
          this._targets.clear();
        }

        takeRecords(): IntersectionObserverEntry[] {
          return [];
        }

        notify(isIntersecting: boolean): void {
          const entries = [...this._targets].map(
            target =>
              ({
                isIntersecting,
                target,
                boundingClientRect: target.getBoundingClientRect(),
                intersectionRatio: isIntersecting ? 1 : 0,
                intersectionRect: target.getBoundingClientRect(),
                rootBounds: null,
                time: 0
              }) as IntersectionObserverEntry
          );
          this._callback(entries, this);
        }
      }

      const RealIntersectionObserver = window.IntersectionObserver;

      beforeEach(() => {
        FakeIntersectionObserver.instances = [];
        (window as any).IntersectionObserver = FakeIntersectionObserver;
      });

      afterEach(() => {
        window.IntersectionObserver = RealIntersectionObserver;
      });

      it('should typeset a visible node without waiting for visibility', async () => {
        const host = document.createElement('div');
        host.innerHTML = '$1 + 1$';
        document.body.appendChild(host);
        await typesetter.typeset(host);
        expect(host.querySelector('mjx-container')).not.toBeNull();
        expect(FakeIntersectionObserver.instances).toHaveLength(0);
        document.body.removeChild(host);
      });

      it.each([
        {
          name: 'display: none',
          hide: (wrapper: HTMLElement) => {
            wrapper.style.display = 'none';
          },
          show: (wrapper: HTMLElement) => {
            wrapper.style.display = '';
          }
        },
        {
          name: 'transform: scale(0)',
          hide: (wrapper: HTMLElement) => {
            wrapper.style.transform = 'scale(0)';
          },
          show: (wrapper: HTMLElement) => {
            wrapper.style.transform = '';
          }
        },
        {
          name: 'content-visibility: hidden',
          hide: (wrapper: HTMLElement) => {
            // Set the property directly, as Lumino does; jsdom discards it
            // from the serialized style, so `setProperty` alone is not
            // observable here.
            wrapper.style.contentVisibility = 'hidden';
          },
          show: (wrapper: HTMLElement) => {
            wrapper.style.contentVisibility = '';
          }
        }
      ])(
        'should not typeset a node hidden with $name until it becomes visible',
        async ({ hide, show }) => {
          const wrapper = document.createElement('div');
          const host = document.createElement('div');
          host.innerHTML = '$1 + 1$';
          wrapper.appendChild(host);
          document.body.appendChild(wrapper);
          hide(wrapper);

          let resolved = false;
          const pending = typesetter.typeset(host).then(() => {
            resolved = true;
          });

          // Give the typesetter time to typeset if it does not wait: poll
          // until math appears, rather than asserting after a fixed delay
          // which a slow render could satisfy by accident.
          const deadline = Date.now() + 500;
          while (
            host.querySelector('mjx-container') === null &&
            Date.now() < deadline
          ) {
            await new Promise(resolve => setTimeout(resolve, 10));
          }
          expect(host.querySelector('mjx-container')).toBeNull();
          expect(resolved).toBe(false);
          expect(FakeIntersectionObserver.instances).toHaveLength(1);

          show(wrapper);
          FakeIntersectionObserver.instances[0].notify(true);
          await pending;
          expect(host.querySelector('mjx-container')).not.toBeNull();
          expect(host.innerHTML).toContain('<mn>1</mn>');
          document.body.removeChild(wrapper);
        }
      );
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
