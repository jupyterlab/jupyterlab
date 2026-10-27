// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { framePromise } from '@jupyterlab/testing';
import {
  AccordionPanelReorderer,
  PanelWithToolbar,
  SidePanel
} from '@jupyterlab/ui-components';
import { AccordionPanel, Widget } from '@lumino/widgets';

describe('#SidePanel', () => {
  it('should initialize handles for prepopulated accordion content', () => {
    const content = new AccordionPanel();
    content.addWidget(new Widget());
    content.addWidget(new Widget());
    const sidebar = new SidePanel({ content });
    try {
      expect(
        content.node.querySelectorAll('.jp-AccordionPanel-dragHandle')
      ).toHaveLength(2);
      expect(AccordionPanelReorderer.get(content)).toBe(
        AccordionPanelReorderer.find(content.node)
      );
    } finally {
      sidebar.dispose();
    }
  });

  it('should dispose its accordion reordering controls', () => {
    const content = new AccordionPanel();
    const sidebar = new SidePanel({ content });
    const reorderer = AccordionPanelReorderer.get(content);
    sidebar.dispose();
    expect(reorderer.isDisposed).toBe(true);
    expect(AccordionPanelReorderer.find(content.node)).toBeUndefined();
    expect(
      content.node.querySelector('.jp-AccordionPanel-dropIndicator')
    ).toBeNull();
  });

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
