// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ILayoutRestorer
} from '@jupyterlab/apputils';

import {
  each
} from '@phosphor/algorithm';

import {
  TabBar, Widget
} from '@phosphor/widgets';


/**
 * The default tab manager extension.
 */
const plugin: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.tab-manager',
  activate: (app: JupyterLab, restorer: ILayoutRestorer): void => {
    const { shell } = app;
    const tabs = new TabBar<Widget>({ orientation: 'vertical' });
    const populate = () => {
      tabs.clearTabs();
      each(shell.widgets('main'), widget => { tabs.addTab(widget.title); });
    };

    restorer.add(tabs, 'tab-manager');
    tabs.id = 'tab-manager';
    tabs.title.label = 'Tabs';
    shell.addToLeftArea(tabs, { rank: 600 });

    app.restored.then(() => {
      populate();
      shell.activeChanged.connect(() => { tabs.update(); });
      shell.currentChanged.connect(() => { populate(); });
      tabs.tabActivateRequested.connect((sender, tab) => {
        shell.activateById(tab.title.owner.id);
      });
      tabs.tabCloseRequested.connect((sender, tab) => {
        tab.title.owner.close();
      });
    });
  },
  autoStart: true,
  requires: [ILayoutRestorer]
};


/**
 * Export the plugin as default.
 */
export default plugin;
