// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { AccordionPanelReorderer } from '@jupyterlab/ui-components';
import { AccordionPanel, Widget } from '@lumino/widgets';

function createPanel(labels: string[]): AccordionPanel {
  const panel = new AccordionPanel();
  for (const label of labels) {
    const widget = new Widget();
    widget.title.label = label;
    panel.addWidget(widget);
  }
  Widget.attach(panel, document.body);
  return panel;
}

/**
 * The section labels in DOM order, which is also the Tab order.
 */
function domLabels(panel: AccordionPanel): string[] {
  return Array.from(
    panel.node.querySelectorAll('.lm-AccordionPanel-titleLabel'),
    node => node.textContent ?? ''
  );
}

describe('AccordionPanelReorderer', () => {
  afterEach(() => {
    AccordionPanelReorderer.enabled = false;
  });

  describe('.enabled', () => {
    it('should make every accordion panel reorderable', () => {
      const panels = [new AccordionPanel(), new AccordionPanel()];
      panels.forEach(panel => AccordionPanelReorderer.get(panel));
      AccordionPanelReorderer.enabled = true;
      try {
        expect(
          panels.map(panel => panel.hasClass('jp-mod-reorderable'))
        ).toEqual([true, true]);
      } finally {
        panels.forEach(panel => panel.dispose());
      }
    });
  });

  describe('.enabledChanged', () => {
    it('should emit the new value when it changes', () => {
      const values: boolean[] = [];
      const record = (_: unknown, value: boolean) => {
        values.push(value);
      };
      AccordionPanelReorderer.enabledChanged.connect(record);
      AccordionPanelReorderer.enabled = true;
      AccordionPanelReorderer.enabled = true;
      AccordionPanelReorderer.enabled = false;
      AccordionPanelReorderer.enabledChanged.disconnect(record);
      expect(values).toEqual([true, false]);
    });
  });

  describe('#panel', () => {
    it('should be the panel whose sections are reordered', () => {
      const panel = createPanel(['A', 'B']);
      try {
        expect(AccordionPanelReorderer.get(panel).panel).toBe(panel);
      } finally {
        panel.dispose();
      }
    });
  });

  describe('#move()', () => {
    let panel: AccordionPanel;

    beforeEach(() => {
      panel = createPanel(['A', 'B', 'C']);
    });

    afterEach(() => {
      panel.dispose();
    });

    it('should move a section down with its header, body and handle', () => {
      const reorderer = AccordionPanelReorderer.get(panel);
      const moved: Widget[] = [];
      reorderer.reordered.connect((_, widget) => {
        moved.push(widget);
      });
      const widget = panel.widgets[0];

      reorderer.move(widget, 2);

      expect(panel.widgets.map(w => w.title.label)).toEqual(['B', 'C', 'A']);
      expect(domLabels(panel)).toEqual(['B', 'C', 'A']);
      expect(widget.node.previousElementSibling).toBe(panel.titles[2]);
      expect(widget.node.nextElementSibling).toBe(panel.handles[2]);
      expect(moved).toEqual([widget]);
    });

    it('should move a section up', () => {
      const reorderer = AccordionPanelReorderer.get(panel);
      const widget = panel.widgets[2];

      reorderer.move(widget, 0);

      expect(panel.widgets.map(w => w.title.label)).toEqual(['C', 'A', 'B']);
      expect(domLabels(panel)).toEqual(['C', 'A', 'B']);
      expect(panel.titles[0].nextElementSibling).toBe(widget.node);
    });

    it('should ignore a move to the same or an invalid index', () => {
      const reorderer = AccordionPanelReorderer.get(panel);
      const moved: Widget[] = [];
      reorderer.reordered.connect((_, widget) => {
        moved.push(widget);
      });

      reorderer.move(panel.widgets[1], 1);
      reorderer.move(panel.widgets[0], -1);
      reorderer.move(panel.widgets[2], 3);
      reorderer.move(new Widget(), 0);

      expect(domLabels(panel)).toEqual(['A', 'B', 'C']);
      expect(moved).toEqual([]);
    });
  });
});
