// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { framePromise } from '@jupyterlab/testing';
import {
  AccordionPanelReorderer,
  PanelWithToolbar,
  SidePanel
} from '@jupyterlab/ui-components';
import { AccordionPanel, Widget } from '@lumino/widgets';

describe('AccordionPanelReorderer', () => {
  let first: AccordionPanel;
  let second: AccordionPanel;

  beforeEach(() => {
    first = new AccordionPanel();
    second = new AccordionPanel();
    AccordionPanelReorderer.get(first).enabled = false;
  });

  afterEach(() => {
    AccordionPanelReorderer.get(first).enabled = false;
    first.dispose();
    second.dispose();
  });

  it('should share the lock across panels', () => {
    const firstReorderer = AccordionPanelReorderer.get(first);
    const secondReorderer = AccordionPanelReorderer.get(second);
    expect(firstReorderer.enabled).toBe(false);
    expect(secondReorderer.enabled).toBe(false);
    expect(first.hasClass('jp-mod-reorderable')).toBe(false);
    expect(second.hasClass('jp-mod-reorderable')).toBe(false);

    firstReorderer.enabled = true;
    expect(secondReorderer.enabled).toBe(true);
    expect(first.hasClass('jp-mod-reorderable')).toBe(true);
    expect(second.hasClass('jp-mod-reorderable')).toBe(true);

    secondReorderer.enabled = false;
    expect(firstReorderer.enabled).toBe(false);
    expect(first.hasClass('jp-mod-reorderable')).toBe(false);
    expect(second.hasClass('jp-mod-reorderable')).toBe(false);
  });

  it('should initialize new panels with the shared lock state', () => {
    AccordionPanelReorderer.get(first).enabled = true;
    const sidebar = new SidePanel({ content: second });
    try {
      expect(AccordionPanelReorderer.get(second).enabled).toBe(true);
      expect(second.hasClass('jp-mod-reorderable')).toBe(true);
      expect(AccordionPanelReorderer.get(first).enabled).toBe(true);
    } finally {
      sidebar.dispose();
    }
  });

  it('should keep other panels unlocked when a reorderer is disposed', () => {
    const firstReorderer = AccordionPanelReorderer.get(first);
    const secondReorderer = AccordionPanelReorderer.get(second);
    firstReorderer.enabled = true;
    secondReorderer.enabled = true;

    firstReorderer.dispose();
    expect(first.hasClass('jp-mod-reorderable')).toBe(false);
    expect(secondReorderer.enabled).toBe(true);
    expect(second.hasClass('jp-mod-reorderable')).toBe(true);

    secondReorderer.enabled = false;
    secondReorderer.enabled = true;
    expect(first.hasClass('jp-mod-reorderable')).toBe(false);
    expect(AccordionPanelReorderer.get(first).enabled).toBe(true);
  });
});

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
