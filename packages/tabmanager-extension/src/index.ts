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
  TabBar
} from '@phosphor/widgets';


/**
 * The default tab manager extension.
 */
const plugin: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.tab-manager',
  activate: (app: JupyterLab, restorer: ILayoutRestorer): void => {
    const tabs = new TabBar({ orientation: 'vertical' });
    const populate = () => {
      tabs.clearTabs();
      each(app.shell.widgets('main'), widget => { tabs.addTab(widget.title); });
    };

    restorer.add(tabs, 'tab-manager');
    tabs.id = 'tab-manager';
    tabs.title.label = 'Tabs';
    populate();
    app.shell.activeChanged.connect(() => { tabs.update(); });
    app.shell.currentChanged.connect(() => { populate(); });
    app.shell.addToLeftArea(tabs, { rank: 600 });
  },
  autoStart: true,
  requires: [ILayoutRestorer]
};


/**
 * Export the plugin as default.
 */
export default plugin;
