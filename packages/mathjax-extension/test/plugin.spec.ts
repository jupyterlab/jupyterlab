// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { CommandRegistry } from '@lumino/commands';
import type { JupyterFrontEnd } from '@jupyterlab/application';
import { ILatexTypesetter } from '@jupyterlab/rendermime';
import plugin from '@jupyterlab/mathjax-extension';

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
    });
  });
});
