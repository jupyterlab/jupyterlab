// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer,
  JupyterLab,
  JupyterLabPlugin
} from '@jupyterlab/application';

import { each } from '@phosphor/algorithm';

import { TabBar, Widget } from '@phosphor/widgets';

import { CommandRegistry } from '@phosphor/commands';

import { Menu } from '@phosphor/widgets';

import '../style/index.css';

namespace CommandIDs {
  export const moveToRightSidebar = 'tabs:move-to-right-area';

  export const moveToLeftSidebar = 'tabs:move-to-left-area';
}

/**
 * The default tab manager extension.
 */
const plugin: JupyterLabPlugin<void> = {
  id: '@jupyterlab/tabmanager-extension:plugin',
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
        each(shell.widgets('main'), widget => {
          tabs.addTab(widget.title);
        });
      };

      // Connect signal handlers.
      shell.layoutModified.connect(() => {
        populate();
      });
      tabs.tabActivateRequested.connect((sender, tab) => {
        shell.activateById(tab.title.owner.id);
      });
      tabs.tabCloseRequested.connect((sender, tab) => {
        tab.title.owner.close();
      });

      addCommands(app);
      const { commands } = app;

      let node = tabs.node.getElementsByClassName('p-TabBar-content')[0];
      node.addEventListener('contextmenu', (event: MouseEvent) => {
        event.preventDefault();
        const menu = createContextMenu(commands);
        menu.open(event.clientX, event.clientY);
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

function addCommands(app: JupyterLab): void {
  const { commands } = app;

  commands.addCommand(CommandIDs.moveToRightSidebar, {
    label: 'Move Tabs to Left Sidebar',
    execute: args => {
      app.shell.moveRightActiveToLeftArea();
    }
  });

  commands.addCommand(CommandIDs.moveToLeftSidebar, {
    label: 'Move Tabs to Right Sidebar',
    execute: () => {
      app.shell.moveLeftActiveToRightArea();
    }
  });
}

function createContextMenu(commands: CommandRegistry): Menu {
  const menu = new Menu({ commands });
  menu.addItem({ command: CommandIDs.moveToRightSidebar });
  menu.addItem({ command: CommandIDs.moveToLeftSidebar });

  return menu;
}
