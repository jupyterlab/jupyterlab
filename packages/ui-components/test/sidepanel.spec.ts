// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { framePromise } from '@jupyterlab/testing';
import { PanelWithToolbar, SidePanel } from '@jupyterlab/ui-components';
import { Widget } from '@lumino/widgets';

describe('#SidePanel', () => {
  describe('AccordionToolbarLayout', () => {
    it('should restore the toolbar when updating the title', async () => {
      const sidebar = new SidePanel();
      const panel = new PanelWithToolbar();
      panel.title.label = 'Initial';

      const toolbarWidget = new Widget();
      panel.toolbar.addItem('toolbar-widget', toolbarWidget);

      sidebar.addWidget(panel);

      Widget.attach(sidebar, document.body);
      await framePromise();

      let title = sidebar.node.getElementsByTagName('h3').item(0);
      expect(
        title?.getElementsByClassName('lm-AccordionPanel-titleLabel').item(0)
          ?.textContent
      ).toBe('Initial');
      expect(
        title?.getElementsByClassName('jp-AccordionPanel-toolbar')
      ).toHaveLength(1);

      panel.title.label = 'Updated';
      await framePromise();

      title = sidebar.node.getElementsByTagName('h3').item(0);
      expect(
        title?.getElementsByClassName('lm-AccordionPanel-titleLabel').item(0)
          ?.textContent
      ).toBe('Updated');
      expect(
        title?.getElementsByClassName('jp-AccordionPanel-toolbar')
      ).toHaveLength(1);
    });
  });
});
