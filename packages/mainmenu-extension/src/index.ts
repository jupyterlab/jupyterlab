// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  Widget
} from '@phosphor/widgets';

import {
  IMainMenu, MainMenu, FileMenu, KernelMenu, ViewMenu
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

  export
  const wordWrap = 'editor:word-wrap';

  export
  const lineNumbering = 'editor:line-numbering';

  export
  const matchBrackets = 'editor:match-brackets';
}

/**
 * A service providing an interface to the main menu.
 */
const menuPlugin: JupyterLabPlugin<IMainMenu> = {
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
    createFileMenu(app, menu.fileMenu);
    createKernelMenu(app, menu.kernelMenu);
    createViewMenu(app, menu.viewMenu);

    app.shell.addToTopArea(logo);
    app.shell.addToTopArea(menu);

    return menu;
  }
};

/**
 * Create the basic `File` menu.
 */
function createFileMenu(app: JupyterLab, menu: FileMenu): void {
  // Create the top-level File menu
  [
    'docmanager:save',
    'docmanager:save-as',
    'docmanager:rename',
    'docmanager:restore-checkpoint',
    'docmanager:clone',
    'docmanager:close',
    'docmanager:close-all-files'
  ].forEach(command => { menu.addItem({ command }); });
  menu.addItem({ type: 'separator' });
  menu.addItem({ command: 'settingeditor:open' });
}

/**
 * Create the basic `Kernel` menu.
 */
function createKernelMenu(app: JupyterLab, menu: KernelMenu): void {
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

  let items = [
    CommandIDs.interruptKernel,
    CommandIDs.restartKernel,
    CommandIDs.changeKernel
  ];
  items.forEach( command => {
    menu.addItem({ command });
    menu.startIndex++;
  });
}

/**
 * Create the basic `View` menu.
 */
function createViewMenu(app: JupyterLab, menu: ViewMenu): void {
  const commands = menu.commands;

  commands.addCommand(CommandIDs.lineNumbering, {
    label: 'Line Numbers',
    isEnabled: () => {
      const viewer = menu.findEditorViewer(app.shell.currentWidget);
      return !!viewer && !!viewer.toggleLineNumbers;
    },
    isToggled: () => {
      const widget = app.shell.currentWidget;
      const viewer = menu.findEditorViewer(widget);
      return !!viewer && !!viewer.lineNumbersToggled(widget);
    },
    execute: () => {
      const widget = app.shell.currentWidget;
      const viewer = menu.findEditorViewer(widget);
      if (!viewer) {
        return Promise.resolve(void 0);
      }
      return viewer.toggleLineNumbers(widget);
    }
  });

  commands.addCommand(CommandIDs.matchBrackets, {
    label: 'Match Brackets',
    isEnabled: () => {
      const viewer = menu.findEditorViewer(app.shell.currentWidget);
      return !!viewer && !!viewer.toggleMatchBrackets;
    },
    isToggled: () => {
      const widget = app.shell.currentWidget;
      const viewer = menu.findEditorViewer(widget);
      return !!viewer && !!viewer.matchBracketsToggled(widget);
    },
    execute: () => {
      const widget = app.shell.currentWidget;
      const viewer = menu.findEditorViewer(widget);
      if (!viewer) {
        return Promise.resolve(void 0);
      }
      return viewer.toggleMatchBrackets(widget);
    }
  });

  commands.addCommand(CommandIDs.wordWrap, {
    label: 'Word Wrap',
    isEnabled: () => {
      const viewer = menu.findEditorViewer(app.shell.currentWidget);
      return !!viewer && !!viewer.toggleWordWrap;
    },
    isToggled: () => {
      const widget = app.shell.currentWidget;
      const viewer = menu.findEditorViewer(widget);
      return !!viewer && !!viewer.wordWrapToggled(widget);
    },
    execute: () => {
      const widget = app.shell.currentWidget;
      const viewer = menu.findEditorViewer(widget);
      if (!viewer) {
        return Promise.resolve(void 0);
      }
      return viewer.toggleWordWrap(widget);
    }
  });

  let items = [
    CommandIDs.lineNumbering,
    CommandIDs.matchBrackets,
    CommandIDs.wordWrap
  ];
  items.forEach( command => {
    menu.addItem({ command });
    menu.startIndex++;
  });
  menu.addItem({ type: 'separator' });
  menu.startIndex++;
}

export default menuPlugin;
