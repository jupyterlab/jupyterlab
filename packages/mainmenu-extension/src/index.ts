// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  Widget
} from '@phosphor/widgets';

import {
  IMainMenu, MainMenu
} from '@jupyterlab/mainmenu';


/**
 * A namespace for command IDs of semantic extension points.
 */
export
namespace CommandIDs {
  export
  const interruptKernel = 'kernel:interrupt';

  export
  const restartKernel = 'kernel:restart';

  export
  const changeKernel = 'kernel:change';
}

/**
 * A service providing an interface to the main menu.
 */
const menu: JupyterLabPlugin<IMainMenu> = {
  id: '@jupyterlab/apputils-extension:menu',
  provides: IMainMenu,
  activate: (app: JupyterLab): IMainMenu => {
    let menu = new MainMenu(app.commands);
    menu.id = 'jp-MainMenu';

    let logo = new Widget();
    logo.addClass('jp-MainAreaPortraitIcon');
    logo.addClass('jp-JupyterIcon');
    logo.id = 'jp-MainLogo';

    // Create the application menus.
    createKernelMenu(app, menu.kernelMenu);

    app.shell.addToTopArea(logo);
    app.shell.addToTopArea(menu);

    return menu;
  }
};

function createKernelMenu(app: JupyterLab, menu: IMainMenu.IKernelMenu): void {
  const commands = menu.commands;

  commands.addCommand(CommandIDs.interruptKernel, {
    label: 'Interrupt Kernel',
    isEnabled: () => {
      const user = menu.findUser(app.shell.currentWidget);
      return !!user && !!user.interruptKernel;
    },
    execute: () => {
      const widget = app.shell.currentWidget;
      const user = menu.findUser(widget);
      if (!user) {
        return Promise.resolve(void 0);
      }
      return user.interruptKernel(widget);
    }
  });

  commands.addCommand(CommandIDs.restartKernel, {
    label: 'Restart Kernel',
    isEnabled: () => {
      const user = menu.findUser(app.shell.currentWidget);
      return !!user && !!user.restartKernel;
    },
    execute: () => {
      const widget = app.shell.currentWidget;
      const user = menu.findUser(widget);
      if (!user) {
        return Promise.resolve(void 0);
      }
      return user.restartKernel(widget);
    }
  });

  commands.addCommand(CommandIDs.changeKernel, {
    label: 'Change Kernel',
    isEnabled: () => {
      const user = menu.findUser(app.shell.currentWidget);
      return !!user && !!user.changeKernel;
    },
    execute: () => {
      const widget = app.shell.currentWidget;
      const user = menu.findUser(widget);
      if (!user) {
        return Promise.resolve(void 0);
      }
      return user.changeKernel(widget);
    }
  });

  menu.addItem({ command: CommandIDs.interruptKernel });
  menu.addItem({ command: CommandIDs.restartKernel });
  menu.addItem({ command: CommandIDs.changeKernel });
}



export default menu;
