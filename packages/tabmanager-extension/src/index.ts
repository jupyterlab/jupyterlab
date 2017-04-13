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
    const { commands, shell } = app;
    const tabs = new TabBar({ orientation: 'vertical' });
    const populate = () => {
      tabs.clearTabs();
      each(shell.widgets('main'), widget => { tabs.addTab(widget.title); });
    };

    restorer.add(tabs, 'tab-manager');
    tabs.id = 'tab-manager';
    tabs.title.label = 'Tabs';
    populate();
    shell.addToLeftArea(tabs, { rank: 600 });

    shell.activeChanged.connect(() => { tabs.update(); });
    shell.currentChanged.connect(() => { populate(); });
    tabs.tabActivateRequested.connect((sender, tab) => {
      const id = (tab.title.owner as Widget).id;

      // If the current widget is clicked, toggle shell mode.
      if (shell.currentWidget.id === id) {
        commands.execute('main-jupyterlab:toggle-mode');
        return;
      }

      // If a new tab is picked, switch to single-document mode and show it.
      commands.execute('main-jupyterlab:set-mode', { mode: 'single-document' })
        .then(() => { shell.activateById(id); });
    });
    tabs.tabCloseRequested.connect((sender, tab) => {
      (tab.title.owner as Widget).close();
    });
  },
  autoStart: true,
  requires: [ILayoutRestorer]
};


/**
 * Export the plugin as default.
 */
export default plugin;
