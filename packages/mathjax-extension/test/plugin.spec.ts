// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { CommandRegistry } from '@lumino/commands';
import type { JupyterFrontEnd } from '@jupyterlab/application';
import type { ILatexTypesetter } from '@jupyterlab/rendermime';
import plugin, { MathJaxTypesetter } from '@jupyterlab/mathjax-extension';

describe('@jupyterlab/mathjax-extension', () => {
  describe('plugin', () => {
    let app: JupyterFrontEnd;
    let typesetter: ILatexTypesetter;

    beforeEach(async () => {
      app = {
        commands: new CommandRegistry()
      } as any;
      typesetter = await plugin.activate(app);
    });

    describe('mathjax:scale', () => {
      it('should scale the equation', async () => {
        const host = document.createElement('div');
        host.innerHTML = '$1 + 1$';
        document.body.appendChild(host);

        // Render at initial scale
        await typesetter.typeset(host);
        let container = host.querySelector('mjx-container') as HTMLElement;
        const sizeBefore = parseFloat(container.style.fontSize);

        // Increase the scale
        await app.commands.execute('mathjax:scale', { scale: 2 });

        // Measure size
        container = host.querySelector('mjx-container') as HTMLElement;
        const sizeAfter = parseFloat(container.style.fontSize);

        expect(sizeAfter).toBeGreaterThan(sizeBefore);
      });

      it.each([
        '$$\\href{https://jupyter.org}{1}$$',
        '$\\href{https://jupyter.org}{1}$'
      ])('should harden remote URLs in links', async input => {
        const host = document.createElement('div');
        host.innerHTML = input;
        document.body.appendChild(host);

        // Render at initial scale
        await typesetter.typeset(host);

        // Re-render at a different scale
        await app.commands.execute('mathjax:scale', { scale: 2 });

        // Check that links are hardened
        expect(host.innerHTML).toContain(
          '<a href="https://jupyter.org" rel="noopener" target="_blank">'
        );
      });

      it('should scale equations of all typesetter instances', async () => {
        const host = document.createElement('div');
        host.innerHTML = '$1 + 1$';
        document.body.appendChild(host);
        await typesetter.typeset(host);

        const otherHost = document.createElement('div');
        otherHost.innerHTML = '\\(2 + 2\\)';
        document.body.appendChild(otherHost);
        const other = new MathJaxTypesetter({ dollarInlineMath: false });
        await other.typeset(otherHost);

        const sizeBefore = (query: HTMLElement) =>
          parseFloat(
            (query.querySelector('mjx-container') as HTMLElement).style.fontSize
          );
        const defaultBefore = sizeBefore(host);
        const otherBefore = sizeBefore(otherHost);

        // Use a scale factor distinct from other tests: the MathDocuments are
        // shared page-wide, so a repeated factor would be a no-op here.
        await app.commands.execute('mathjax:scale', { scale: 4 });

        expect(sizeBefore(host)).toBeGreaterThan(defaultBefore);
        expect(sizeBefore(otherHost)).toBeGreaterThan(otherBefore);
      });
    });

    describe('mathjax:clipboard', () => {
      let writeText: jest.Mock;

      beforeEach(() => {
        writeText = jest.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', {
          value: { writeText },
          configurable: true
        });
      });

      it('should copy the expression on which the context menu was opened', async () => {
        const host = document.createElement('div');
        host.innerHTML = '$1 + 1$ and $2 + 2$';
        document.body.appendChild(host);
        await typesetter.typeset(host);

        const containers = host.querySelectorAll('mjx-container');
        expect(containers).toHaveLength(2);
        (app as any).contextMenuHitTest = jest
          .fn()
          .mockReturnValue(containers[0]);

        await app.commands.execute('mathjax:clipboard');

        expect(writeText).toHaveBeenCalledWith('1 + 1');
      });

      it('should copy from the clicked instance even after another instance typeset', async () => {
        const host = document.createElement('div');
        host.innerHTML = '$1 + 1$';
        document.body.appendChild(host);
        await typesetter.typeset(host);

        const otherHost = document.createElement('div');
        otherHost.innerHTML = '\\(2 + 2\\)';
        document.body.appendChild(otherHost);
        const other = new MathJaxTypesetter({ dollarInlineMath: false });
        await other.typeset(otherHost);

        (app as any).contextMenuHitTest = jest
          .fn()
          .mockReturnValue(host.querySelector('mjx-container'));

        await app.commands.execute('mathjax:clipboard');

        expect(writeText).toHaveBeenCalledWith('1 + 1');
      });

      it('should copy the current expression after a host is re-rendered', async () => {
        const host = document.createElement('div');
        host.innerHTML = '$1 + 1$';
        document.body.appendChild(host);
        await typesetter.typeset(host);

        // Replace the content and typeset again, as happens when a markdown
        // cell is re-rendered.
        host.innerHTML = '$3 + 3$';
        await typesetter.typeset(host);

        (app as any).contextMenuHitTest = jest
          .fn()
          .mockReturnValue(host.querySelector('mjx-container'));

        await app.commands.execute('mathjax:clipboard');

        expect(writeText).toHaveBeenCalledWith('3 + 3');
      });
    });
  });
});
