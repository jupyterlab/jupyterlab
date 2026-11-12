// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { AccordionPanelReorderer } from '@jupyterlab/ui-components';
import { AccordionPanel } from '@lumino/widgets';

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
});
