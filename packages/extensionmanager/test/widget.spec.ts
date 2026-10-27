// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { PageConfig } from '@jupyterlab/coreutils';
import { ExtensionsPanel, ListModel } from '@jupyterlab/extensionmanager';
import { ServiceManagerMock } from '@jupyterlab/services/lib/testutils';
import { nullTranslator } from '@jupyterlab/translation';
import { AccordionPanel } from '@lumino/widgets';

describe('ExtensionsPanel', () => {
  it.each([true, false])(
    'should collapse the warning after reordering with can_install=%s',
    canInstall => {
      PageConfig.setOption(
        'extensionManager',
        JSON.stringify({ ['can_install']: canInstall })
      );
      const services = new ServiceManagerMock();
      const model = new ListModel(services);
      const panel = new ExtensionsPanel({ model, translator: nullTranslator });
      try {
        const accordion = panel.content;
        expect(accordion).toBeInstanceOf(AccordionPanel);
        const warning = accordion.widgets[0];
        const installed = accordion.widgets[1];
        accordion.insertWidget(1, warning);
        model.isDisclaimed = true;
        expect(warning.isHidden).toBe(true);
        expect(installed.isHidden).toBe(false);
        expect(
          accordion.widgets.filter(widget => !widget.isHidden)
        ).toHaveLength(canInstall ? 2 : 1);
      } finally {
        panel.dispose();
        model.dispose();
        services.dispose();
        PageConfig.setOption('extensionManager', '{}');
      }
    }
  );
});
