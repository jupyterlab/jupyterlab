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
  EditMenu, FileMenu, KernelMenu, MainMenu, RunMenu, ViewMenu
} from '@jupyterlab/mainmenu';


/**
 * A namespace for command IDs of semantic extension points.
 */
export
namespace CommandIDs {
  export
  const clear = 'editmenu:clear';

  export
  const closeAndCleanup = 'filemenu:close-and-cleanup';

  export
  const interruptKernel = 'kernelmenu:interrupt';

  export
  const restartKernel = 'kernelmenu:restart';

  export
  const changeKernel = 'kernelmenu:change';

  export
  const createConsole = 'kernelmenu:create-console';

  export
  const wordWrap = 'viewmenu:word-wrap';

  export
  const lineNumbering = 'viewmenu:line-numbering';

  export
  const matchBrackets = 'viewmenu:match-brackets';

  export
  const run = 'runmenu:run';

  export
  const runAll = 'runmenu:run-all';

  export
  const runAbove = 'runmenu:run-above';

  export
  const runBelow = 'runmenu:run-below';
}

/**
 * A service providing an interface to the main menu.
 */
const menuPlugin: JupyterLabPlugin<IMainMenu> = {
  id: '@jupyterlab/mainmenu-extension:plugin',
  provides: IMainMenu,
  activate: (app: JupyterLab): IMainMenu => {
    let menu = new MainMenu(app.commands);
    menu.id = 'jp-MainMenu';

    let logo = new Widget();
    logo.addClass('jp-MainAreaPortraitIcon');
    logo.addClass('jp-JupyterIcon');
    logo.id = 'jp-MainLogo';

    // Create the application menus.
    createEditMenu(app, menu.editMenu);
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
 * Create the basic `Edit` menu.
 */
function createEditMenu(app: JupyterLab, menu: EditMenu): void {
  const commands = menu.commands;

  commands.addCommand(CommandIDs.clear, {
    label: () => {
      const action =
        Private.delegateLabel(app, menu.clearers, 'noun');
      return `Clear${action ? ` ${action}` : '…'}`;
    },
    isEnabled:
      Private.delegateEnabled(app, menu.clearers, 'clear'),
    execute:
      Private.delegateExecute(app, menu.clearers, 'clear')
  });
  menu.addGroup([{ command: CommandIDs.clear }], 10);
}

/**
 * Create the basic `File` menu.
 */
function createFileMenu(app: JupyterLab, menu: FileMenu): void {
  const commands = menu.commands;

  // Add a delegator command for closing and cleaning up an activity.
  commands.addCommand(CommandIDs.closeAndCleanup, {
    label: () => {
      const widget = app.shell.currentWidget;
      const name = widget ? widget.title.label : '...';
      const action =
        Private.delegateLabel(app, menu.closeAndCleaners, 'action');
      return `Close and ${action ? ` ${action} "${name}"` : 'Shutdown…'}`;
    },
    isEnabled:
      Private.delegateEnabled(app, menu.closeAndCleaners, 'closeAndCleanup'),
    execute:
      Private.delegateExecute(app, menu.closeAndCleaners, 'closeAndCleanup')
  });

  // Add the commands to the File menu.
  const fileOperationGroup = [
    'docmanager:save',
    'docmanager:save-as',
    'docmanager:rename',
    'docmanager:restore-checkpoint',
    'docmanager:clone'
  ].map(command => { return { command }; });

  const closeGroup = [
    'docmanager:close',
    'filemenu:close-and-cleanup',
    'docmanager:close-all-files'
  ].map(command => { return { command }; });

  menu.addGroup(fileOperationGroup, 1);
  menu.addGroup(closeGroup, 2);
  menu.addGroup([{ command: 'settingeditor:open' }], 1000);
}

/**
 * Create the basic `Kernel` menu.
 */
function createKernelMenu(app: JupyterLab, menu: KernelMenu): void {
  const commands = menu.commands;

  commands.addCommand(CommandIDs.interruptKernel, {
    label: 'Interrupt Kernel',
    isEnabled: Private.delegateEnabled(app, menu.kernelUsers, 'interruptKernel'),
    execute: Private.delegateExecute(app, menu.kernelUsers, 'interruptKernel')
  });

  commands.addCommand(CommandIDs.restartKernel, {
    label: 'Restart Kernel',
    isEnabled: Private.delegateEnabled(app, menu.kernelUsers, 'restartKernel'),
    execute: Private.delegateExecute(app, menu.kernelUsers, 'restartKernel')
  });

  commands.addCommand(CommandIDs.changeKernel, {
    label: 'Change Kernel',
    isEnabled: Private.delegateEnabled(app, menu.kernelUsers, 'changeKernel'),
    execute: Private.delegateExecute(app, menu.kernelUsers, 'changeKernel')
  });

  commands.addCommand(CommandIDs.createConsole, {
    label: () => {
      const name = Private.findExtenderName(app, menu.consoleCreators);
      const label = `Create Console for${name ? ` ${name}` : '…'}`;
      return label;
    },
    isEnabled: Private.delegateEnabled(app, menu.consoleCreators, 'createConsole'),
    execute: Private.delegateExecute(app, menu.consoleCreators, 'createConsole')
  });

  const kernelUserGroup = [
    CommandIDs.interruptKernel,
    CommandIDs.restartKernel,
    CommandIDs.changeKernel
  ].map(command => { return { command }; });
  menu.addGroup(kernelUserGroup, 0);

  menu.addGroup([{ command: CommandIDs.createConsole }], 1);
}

/**
 * Create the basic `View` menu.
 */
function createViewMenu(app: JupyterLab, menu: ViewMenu): void {
  const commands = menu.commands;

  commands.addCommand(CommandIDs.lineNumbering, {
    label: 'Line Numbers',
    isEnabled: Private.delegateEnabled
             (app, menu.editorViewers, 'toggleLineNumbers'),
    isToggled: Private.delegateToggled
             (app, menu.editorViewers, 'lineNumbersToggled'),
    execute: Private.delegateExecute
             (app, menu.editorViewers, 'toggleLineNumbers')
  });

  commands.addCommand(CommandIDs.matchBrackets, {
    label: 'Match Brackets',
    isEnabled: Private.delegateEnabled
             (app, menu.editorViewers, 'toggleMatchBrackets'),
    isToggled: Private.delegateToggled
             (app, menu.editorViewers, 'matchBracketsToggled'),
    execute: Private.delegateExecute
             (app, menu.editorViewers, 'toggleMatchBrackets')
  });

  commands.addCommand(CommandIDs.wordWrap, {
    label: 'Word Wrap',
    isEnabled: Private.delegateEnabled
               (app, menu.editorViewers, 'toggleWordWrap'),
    isToggled: Private.delegateToggled
               (app, menu.editorViewers, 'wordWrapToggled'),
    execute: Private.delegateExecute
               (app, menu.editorViewers, 'toggleWordWrap')
  });

  const editorViewerGroup = [
    CommandIDs.lineNumbering,
    CommandIDs.matchBrackets,
    CommandIDs.wordWrap
  ].map( command => { return { command }; });
  menu.addGroup(editorViewerGroup, 10);
}

function createRunMenu(app: JupyterLab, menu: RunMenu): void {
  const commands = menu.commands;

  commands.addCommand(CommandIDs.run, {
    label: () => {
      const noun = Private.delegateLabel(app, menu.codeRunners, 'noun');
      return `Run${noun ? ` ${noun}(s)` : ''}`;
    },
    isEnabled: Private.delegateEnabled(app, menu.codeRunners, 'run'),
    execute: Private.delegateExecute(app, menu.codeRunners, 'run')
  });

  commands.addCommand(CommandIDs.runAll, {
    label: () => {
      const noun = Private.delegateLabel(app, menu.codeRunners, 'noun');
      return `Run All${noun ? ` ${noun}s` : ''}`;
    },
    isEnabled: Private.delegateEnabled(app, menu.codeRunners, 'runAll'),
    execute: Private.delegateExecute(app, menu.codeRunners, 'runAll')
  });

  commands.addCommand(CommandIDs.runAbove, {
    label: () => {
      const noun = Private.delegateLabel(app, menu.codeRunners, 'noun');
      return `Run${noun ? ` ${noun}(s)` : ''} Above`;
    },
    isEnabled: Private.delegateEnabled(app, menu.codeRunners, 'runAbove'),
    execute: Private.delegateExecute(app, menu.codeRunners, 'runAbove')
  });

  commands.addCommand(CommandIDs.runBelow, {
    label: () => {
      const noun = Private.delegateLabel(app, menu.codeRunners, 'noun');
      return `Run${noun ? ` ${noun}(s)` : ''} Below`;
    },
    isEnabled: Private.delegateEnabled(app, menu.codeRunners, 'runBelow'),
    execute: Private.delegateExecute(app, menu.codeRunners, 'runBelow')
  });

  const codeRunnerGroup = [
    CommandIDs.run,
    CommandIDs.runAll,
    CommandIDs.runAbove,
    CommandIDs.runBelow,
  ].map(command => { return { command }; });
  menu.addGroup(codeRunnerGroup, 0)
}
export default menuPlugin;

/**
 * A namespace for Private data.
 */
namespace Private {
  /**
   * Given a widget and a map containing IMenuExtenders,
   * check the tracker and return the extender, if any,
   * that holds the widget.
   */
  function findExtender<E extends IMenuExtender<Widget>>(widget: Widget, map: Map<string, E>): [string, E] {
    let extender: E;
    let name = '';
    map.forEach((value, key) => {
      if (value.tracker.has(widget)) {
        extender = value;
        name = key;
      }
    });
    return [name, extender];
  }

  /**
   * Given a map containing IMenuExtenders,
   * return the key of the extender, or the empty string if none is found.
   */
  export
  function findExtenderName<E extends IMenuExtender<Widget>>(app: JupyterLab, map: Map<string, E>): string {
    const widget = app.shell.currentWidget;
    const [name, ] = findExtender(widget, map);
    return name;
  }

  export
  function delegateLabel<E extends IMenuExtender<Widget>>(app: JupyterLab, map: Map<string, E>, label: keyof E): string {
    let widget = app.shell.currentWidget;
    const [, extender] = findExtender(widget, map);
    if (!extender) {
      return '';
    }
    return extender[label];
  }

  /**
   * A utility function that delegates command execution
   * to an IMenuExtender.
   */
  export
  function delegateExecute<E extends IMenuExtender<Widget>>(app: JupyterLab, map: Map<string, E>, executor: keyof E): () => Promise<any> {
    return () => {
      let widget = app.shell.currentWidget;
      const [, extender] = findExtender(widget, map);
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
  function delegateEnabled<E extends IMenuExtender<Widget>>(app: JupyterLab, map: Map<string, E>, executor: keyof E): () => boolean {
    return () => {
      let widget = app.shell.currentWidget;
      const [, extender] = findExtender(widget, map);
      return !!extender && !!extender[executor];
    };
  }

  /**
   * A utility function that delegates whether a command is toggled
   * for an IMenuExtender.
   */
  export
  function delegateToggled<E extends IMenuExtender<Widget>>(app: JupyterLab, map: Map<string, E>, toggled: keyof E): () => boolean {
    return () => {
      let widget = app.shell.currentWidget;
      const [, extender] = findExtender(widget, map);
      return !!extender && !!extender[toggled] && !!extender[toggled](widget);
    };
  }
}
