// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { each } from '@lumino/algorithm';
import { Widget } from '@lumino/widgets';

import {
  ILabShell,
  ILayoutRestorer,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { ITranslator } from '@jupyterlab/translation';
import { TabBarSvg, tabIcon } from '@jupyterlab/ui-components';

/**
 * The default tab manager extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/tabmanager-extension:plugin',
  autoStart: true,
  requires: [ITranslator],
  optional: [ILabShell, ILayoutRestorer],
  activate: (
    app: JupyterFrontEnd,
    translator: ITranslator,
    labShell: ILabShell | null,
    restorer: ILayoutRestorer | null
  ): void => {
    const trans = translator.load('jupyterlab');
    const { shell } = app;
    const tabs = new TabBarSvg<Widget>({ orientation: 'vertical' });
    const header = document.createElement('header');

    if (restorer) {
      restorer.add(tabs, 'tab-manager');
    }

    const content = trans.__('Open Tabs');

    tabs.id = 'tab-manager';
    tabs.title.caption = content;
    tabs.title.icon = tabIcon;
    header.textContent = content;
    tabs.node.insertBefore(header, tabs.contentNode);
    shell.add(tabs, 'left', { rank: 600 });

    void app.restored.then(() => {
      const populate = () => {
        tabs.clearTabs();
        each(shell.widgets('main'), widget => {
          tabs.addTab(widget.title);
        });
      };

      // Connect signal handlers.
      tabs.tabActivateRequested.connect((sender, tab) => {
        shell.activateById(tab.title.owner.id);
      });
      tabs.tabCloseRequested.connect((sender, tab) => {
        tab.title.owner.close();
        populate();
      });

      // If available, connect to the shell's layout modified signal.
      if (labShell) {
        labShell.layoutModified.connect(() => {
          populate();
        });
      }

      // Populate the tab manager.
      populate();
    });
  }
};

/**
 * Export the plugin as default.
 */
export default plugin;
