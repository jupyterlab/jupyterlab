// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  Widget
} from '@phosphor/widgets';

import {
  IMainMenu, IMenuExtender,
  MainMenu, FileMenu, KernelMenu, ViewMenu, RunMenu
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

  let findUser = (widget: Widget) => {
    return menu.findUser(widget);
  };
  commands.addCommand(CommandIDs.interruptKernel, {
    label: 'Interrupt Kernel',
    isEnabled: Private.delegateEnabled(app, findUser, 'interruptKernel'),
    execute: Private.delegateExecute(app, findUser, 'interruptKernel')
  });

  commands.addCommand(CommandIDs.restartKernel, {
    label: 'Restart Kernel',
    isEnabled: Private.delegateEnabled(app, findUser, 'restartKernel'),
    execute: Private.delegateExecute(app, findUser, 'restartKernel')
  });

  commands.addCommand(CommandIDs.changeKernel, {
    label: 'Change Kernel',
    isEnabled: Private.delegateEnabled(app, findUser, 'changeKernel'),
    execute: Private.delegateExecute(app, findUser, 'changeKernel')
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

  let findEditorViewer = (widget: Widget) => {
    return menu.findEditorViewer(widget);
  };
  commands.addCommand(CommandIDs.lineNumbering, {
    label: 'Line Numbers',
    isEnabled: Private.delegateEnabled
             (app, findEditorViewer, 'toggleLineNumbers'),
    isToggled: Private.delegateToggled
             (app, findEditorViewer, 'lineNumbersToggled'),
    execute: Private.delegateExecute
             (app, findEditorViewer, 'toggleLineNumbers')
  });

  commands.addCommand(CommandIDs.matchBrackets, {
    label: 'Match Brackets',
    isEnabled: Private.delegateEnabled
             (app, findEditorViewer, 'toggleMatchBrackets'),
    isToggled: Private.delegateToggled
             (app, findEditorViewer, 'matchBracketsToggled'),
    execute: Private.delegateExecute
             (app, findEditorViewer, 'toggleMatchBrackets')
  });

  commands.addCommand(CommandIDs.wordWrap, {
    label: 'Word Wrap',
    isEnabled: Private.delegateEnabled
               (app, findEditorViewer, 'toggleWordWrap'),
    isToggled: Private.delegateToggled
               (app, findEditorViewer, 'wordWrapToggled'),
    execute: Private.delegateExecute
               (app, findEditorViewer, 'toggleWordWrap')
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

  let findRunner = (widget: Widget) => {
    return menu.findRunner(widget);
  };
  commands.addCommand(CommandIDs.run, {
    label: 'Run',
    isEnabled: Private.delegateEnabled(app, findRunner, 'run'),
    execute: Private.delegateExecute(app, findRunner, 'run')
  });

  commands.addCommand(CommandIDs.runAll, {
    label: 'Run All',
    isEnabled: Private.delegateEnabled(app, findRunner, 'runAll'),
    execute: Private.delegateExecute(app, findRunner, 'runAll')
  });

  commands.addCommand(CommandIDs.runAbove, {
    label: 'Run Above',
    isEnabled: Private.delegateEnabled(app, findRunner, 'runAbove'),
    execute: Private.delegateExecute(app, findRunner, 'runAbove')
  });

  commands.addCommand(CommandIDs.runBelow, {
    label: 'Run Below',
    isEnabled: Private.delegateEnabled(app, findRunner, 'runBelow'),
    execute: Private.delegateExecute(app, findRunner, 'runBelow')
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

/**
 * A namespace for Private data.
 */
namespace Private {
  /**
   * A utility function that delegates command execution
   * to an IMenuExtender.
   */
  export
  function delegateExecute<E extends IMenuExtender<Widget>>(app: JupyterLab, finder: (w: Widget) => E, executor: keyof E): () => Promise<any> {
    return () => {
      let widget = app.shell.currentWidget;
      const extender = finder(widget);
      if (!extender) {
        return Promise.resolve(void 0);
      }
      return extender[executor](widget);
    };
  }

  /**
   * A utility function that delegates whether a command is enabled
   * to an IMenuExtender.
   */
  export
  function delegateEnabled<E extends IMenuExtender<Widget>>(app: JupyterLab, finder: (w: Widget) => E, executor: keyof E): () => boolean {
    return () => {
      let widget = app.shell.currentWidget;
      const extender = finder(widget);
      return !!extender && !!extender[executor];
    };
  }

  /**
   * A utility function that delegates whether a command is toggled
   * for an IMenuExtender.
   */
  export
  function delegateToggled<E extends IMenuExtender<Widget>>(app: JupyterLab, finder: (w: Widget) => E, toggled: keyof E): () => boolean {
    return () => {
      let widget = app.shell.currentWidget;
      const extender = finder(widget);
      return !!extender && !!extender[toggled] && !!extender[toggled](widget);
    };
  }
}
