// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  Widget
} from '@phosphor/widgets';

import {
  IMainMenu, MainMenu, FileMenu, KernelMenu, ViewMenu, RunMenu
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

  export
  const run = 'run:run';

  export
  const runAll = 'run:run-all';

  export
  const runAbove = 'run:run-above';

  export
  const runBelow = 'run:run-below';
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
    createRunMenu(app, menu.runMenu);
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
      return !!viewer &&
             !!viewer.lineNumbersToggled &&
             !!viewer.lineNumbersToggled(widget);
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
      return !!viewer &&
             !!viewer.matchBracketsToggled &&
             !!viewer.matchBracketsToggled(widget);
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
      return !!viewer &&
             !!viewer.wordWrapToggled &&
             !!viewer.wordWrapToggled(widget);
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

function createRunMenu(app: JupyterLab, menu: RunMenu): void {
  const commands = menu.commands;

  commands.addCommand(CommandIDs.run, {
    label: 'Run',
    isEnabled: () => {
      const runner = menu.findRunner(app.shell.currentWidget);
      return !!runner && !!runner.run;
    },
    execute: () => {
      const widget = app.shell.currentWidget;
      const runner = menu.findRunner(widget);
      if (!runner) {
        return Promise.resolve(void 0);
      }
      return runner.run(widget);
    }
  });

  commands.addCommand(CommandIDs.runAll, {
    label: 'Run All',
    isEnabled: () => {
      const runner = menu.findRunner(app.shell.currentWidget);
      return !!runner && !!runner.runAll;
    },
    execute: () => {
      const widget = app.shell.currentWidget;
      const runner = menu.findRunner(widget);
      if (!runner) {
        return Promise.resolve(void 0);
      }
      return runner.runAll(widget);
    }
  });

  commands.addCommand(CommandIDs.runAbove, {
    label: 'Run Above',
    isEnabled: () => {
      const runner = menu.findRunner(app.shell.currentWidget);
      return !!runner && !!runner.runAbove;
    },
    execute: () => {
      const widget = app.shell.currentWidget;
      const runner = menu.findRunner(widget);
      if (!runner) {
        return Promise.resolve(void 0);
      }
      return runner.runAbove(widget);
    }
  });

  commands.addCommand(CommandIDs.runBelow, {
    label: 'Run Below',
    isEnabled: () => {
      const runner = menu.findRunner(app.shell.currentWidget);
      return !!runner && !!runner.runBelow;
    },
    execute: () => {
      const widget = app.shell.currentWidget;
      const runner = menu.findRunner(widget);
      if (!runner) {
        return Promise.resolve(void 0);
      }
      return runner.runBelow(widget);
    }
  });

  let items = [
    CommandIDs.run,
    CommandIDs.runAll,
    CommandIDs.runAbove,
    CommandIDs.runBelow,
  ];
  items.forEach( command => {
    menu.addItem({ command });
    menu.startIndex++;
  });
}
export default menuPlugin;
