// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer, JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  each
} from '@phosphor/algorithm';

import {
  TabBar, Widget
} from '@phosphor/widgets';

import '../style/index.css';

/**
 * The default tab manager extension.
 */
const plugin: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.tab-manager',
  activate: (app: JupyterLab, restorer: ILayoutRestorer): void => {
    const { shell } = app;
    const tabs = new TabBar<Widget>({ orientation: 'vertical' });
    const header = document.createElement('header');

    restorer.add(tabs, 'tab-manager');
    tabs.id = 'tab-manager';
    tabs.title.label = 'Tabs';
    header.textContent = 'Open Tabs';
    tabs.node.insertBefore(header, tabs.contentNode);
    shell.addToLeftArea(tabs, { rank: 600 });

    app.restored.then(() => {
      const populate = () => {
        tabs.clearTabs();
        each(shell.widgets('main'), widget => { tabs.addTab(widget.title); });
      };

      // Connect signal handlers.
      shell.layoutModified.connect(() => { populate(); });
      tabs.tabActivateRequested.connect((sender, tab) => {
        shell.activateById(tab.title.owner.id);
      });
      tabs.tabCloseRequested.connect((sender, tab) => {
        tab.title.owner.close();
      });

      // Populate the tab manager.
      populate();
    });
  },
  autoStart: true,
  requires: [ILayoutRestorer]
};


/**
 * Export the plugin as default.
 */
export default plugin;
