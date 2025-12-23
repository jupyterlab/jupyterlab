// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Palette } from '../src/palette';
import { nullTranslator } from '@jupyterlab/translation';
import type { JupyterFrontEnd } from '@jupyterlab/application';
import { Application } from '@lumino/application';
import { Widget } from '@lumino/widgets';

class DummyShell extends Widget {
  add(widget: Widget): void {
    document.body.appendChild(widget.node);
  }
}

describe('Palette', () => {
  describe('#activate()', () => {
    it('command palette should have aria-label and role for accessibility', async () => {
      const app = new Application({ shell: new DummyShell() });
      const settingRegistry = null;
      Palette.activate(app as JupyterFrontEnd, nullTranslator, settingRegistry);

      const node = document.getElementById('command-palette')!;
      expect(node.getAttribute('aria-label')).toEqual(
        'Command Palette Section'
      );
      expect(node.getAttribute('role')).toEqual('region');
    });
  });
});
