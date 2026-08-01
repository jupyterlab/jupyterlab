// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import { CommandRegistry } from '@lumino/commands';
import type { JupyterFrontEnd } from '@jupyterlab/application';
import type { ILatexTypesetter } from '@jupyterlab/rendermime';
import plugin, { MathJaxTypesetter } from '@jupyterlab/mathjax-extension';

// This lives in its own file (rather than in `plugin.spec.ts`) because it
// requires that no MathDocument for the non-default delimiter configuration
// exists yet when the scale command runs; the per-configuration document
// cache is shared module-wide, so a fresh module registry is needed.
describe('@jupyterlab/mathjax-extension', () => {
  describe('mathjax:scale', () => {
    it('should apply the current scale to documents created later', async () => {
      const app = {
        commands: new CommandRegistry()
      } as any as JupyterFrontEnd;
      const typesetter: ILatexTypesetter = await plugin.activate(app);

      const fontSize = (host: HTMLElement) =>
        parseFloat(
          (host.querySelector('mjx-container') as HTMLElement).style.fontSize
        );

      const host = document.createElement('div');
      host.innerHTML = '$1 + 1$';
      document.body.appendChild(host);
      await typesetter.typeset(host);
      const baseline = fontSize(host);

      await app.commands.execute('mathjax:scale', { scale: 2 });

      // The document for this delimiter configuration is only created now,
      // after the scale was changed; it should inherit the current scale.
      const otherHost = document.createElement('div');
      otherHost.innerHTML = '\\(1 + 1\\)';
      document.body.appendChild(otherHost);
      const other = new MathJaxTypesetter({ dollarInlineMath: false });
      await other.typeset(otherHost);

      expect(fontSize(otherHost)).toBeGreaterThan(baseline);
      expect(fontSize(otherHost)).toBeCloseTo(fontSize(host));
    });
  });
});
