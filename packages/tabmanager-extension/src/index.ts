// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILabShell,
  ILayoutRestorer,
  JupyterClient,
  JupyterLabPlugin
} from '@jupyterlab/application';

import { each } from '@phosphor/algorithm';

import { TabBar, Widget } from '@phosphor/widgets';

import '../style/index.css';

/**
 * The default tab manager extension.
 */
const plugin: JupyterLabPlugin<void> = {
  id: '@jupyterlab/tabmanager-extension:plugin',
  activate: (
    app: JupyterClient,
    restorer: ILayoutRestorer,
    labShell: ILabShell | null
  ): void => {
    const { shell } = app;
    const tabs = new TabBar<Widget>({ orientation: 'vertical' });
    const header = document.createElement('header');
    let debouncer: number;

    restorer.add(tabs, 'tab-manager');
    tabs.id = 'tab-manager';
    tabs.title.iconClass = 'jp-TabIcon jp-SideBar-tabIcon';
    tabs.title.caption = 'Open Tabs';
    header.textContent = 'Open Tabs';
    tabs.node.insertBefore(header, tabs.contentNode);
    shell.add(tabs, 'left', { rank: 600 });

    app.restored.then(() => {
      const populate = () => {
        window.clearTimeout(debouncer);
        debouncer = window.setTimeout(() => {
          tabs.clearTabs();
          each(shell.widgets('main'), widget => {
            tabs.addTab(widget.title);
          });
        }, 0);
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
  },
  autoStart: true,
  requires: [ILayoutRestorer],
  optional: [ILabShell]
};

/**
 * Export the plugin as default.
 */
export default plugin;
