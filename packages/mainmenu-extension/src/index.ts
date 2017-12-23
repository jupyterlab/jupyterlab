// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  each
} from '@phosphor/algorithm';

import {
  Menu, Widget
} from '@phosphor/widgets';

import {
  IMainMenu, IMenuExtender, EditMenu, FileMenu, KernelMenu,
  MainMenu, RunMenu, SettingsMenu, ViewMenu, TabsMenu
} from '@jupyterlab/mainmenu';


/**
 * A namespace for command IDs of semantic extension points.
 */
export
namespace CommandIDs {
  export
  const undo = 'editmenu:undo';

  export
  const redo = 'editmenu:redo';

  export
  const clearCurrent = 'editmenu:clear-current';

  export
  const clearAll = 'editmenu:clear-all';

  export
  const find = 'editmenu:find';

  export
  const findAndReplace = 'editmenu:find-and-replace';

  export
  const closeAndCleanup = 'filemenu:close-and-cleanup';

  export
  const createConsole = 'filemenu:create-console';

  export
  const interruptKernel = 'kernelmenu:interrupt';

  export
  const restartKernel = 'kernelmenu:restart';

  export
  const restartKernelAndClear = 'kernelmenu:restart-and-clear';

  export
  const changeKernel = 'kernelmenu:change';

  export
  const shutdownKernel = 'kernelmenu:shutdown';

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
  const restartAndRunAll = 'runmenu:restart-and-run-all';

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
    createSettingsMenu(app, menu.settingsMenu);
    createViewMenu(app, menu.viewMenu);
    createTabsMenu(app, menu.tabsMenu);

    app.shell.addToTopArea(logo);
    app.shell.addToTopArea(menu);

    return menu;
  }
};

/**
 * Create the basic `Edit` menu.
 */
function createEditMenu(app: JupyterLab, menu: EditMenu): void {
  const commands = menu.menu.commands;

  // Add the undo/redo commands the the Edit menu.
  commands.addCommand(CommandIDs.undo, {
    label: 'Undo',
    isEnabled:
      Private.delegateEnabled(app, menu.undoers, 'undo'),
    execute:
      Private.delegateExecute(app, menu.undoers, 'undo')
  });
  commands.addCommand(CommandIDs.redo, {
    label: 'Redo',
    isEnabled:
      Private.delegateEnabled(app, menu.undoers, 'redo'),
    execute:
      Private.delegateExecute(app, menu.undoers, 'redo')
  });
  menu.addGroup([
    { command: CommandIDs.undo },
    { command: CommandIDs.redo }
  ], 0);

  // Add the clear commands to the Edit menu.
  commands.addCommand(CommandIDs.clearCurrent, {
    label: () => {
      const noun =
        Private.delegateLabel(app, menu.clearers, 'noun');
      const enabled =
        Private.delegateEnabled(app, menu.clearers, 'clearCurrent')();
      return `Clear${enabled ? ` ${noun}` : ''}`;
    },
    isEnabled:
      Private.delegateEnabled(app, menu.clearers, 'clearCurrent'),
    execute:
      Private.delegateExecute(app, menu.clearers, 'clearCurrent')
  });
  commands.addCommand(CommandIDs.clearAll, {
    label: () => {
      const noun = Private.delegateLabel(app, menu.clearers, 'noun');
      const enabled = Private.delegateEnabled(app, menu.clearers, 'clearAll')();
      return `Clear All${enabled ? ` ${noun}` : ''}`;
    },
    isEnabled:
      Private.delegateEnabled(app, menu.clearers, 'clearAll'),
    execute:
      Private.delegateExecute(app, menu.clearers, 'clearAll')
  });
  menu.addGroup([
    { command: CommandIDs.clearCurrent },
    { command: CommandIDs.clearAll },
  ], 10);

  // Add the find/replace commands the the Edit menu.
  commands.addCommand(CommandIDs.find, {
    label: 'Find…',
    isEnabled:
      Private.delegateEnabled(app, menu.findReplacers, 'find'),
    execute:
      Private.delegateExecute(app, menu.findReplacers, 'find')
  });
  commands.addCommand(CommandIDs.findAndReplace, {
    label: 'Find and Replace…',
    isEnabled:
      Private.delegateEnabled(app, menu.findReplacers, 'findAndReplace'),
    execute:
      Private.delegateExecute(app, menu.findReplacers, 'findAndReplace')
  });
  menu.addGroup([
    { command: CommandIDs.find },
    { command: CommandIDs.findAndReplace }
  ], 200);
}

/**
 * Create the basic `File` menu.
 */
function createFileMenu(app: JupyterLab, menu: FileMenu): void {
  const commands = menu.menu.commands;

  // Add a delegator command for closing and cleaning up an activity.
  commands.addCommand(CommandIDs.closeAndCleanup, {
    label: () => {
      const action =
        Private.delegateLabel(app, menu.closeAndCleaners, 'action');
      const name =
        Private.delegateLabel(app, menu.closeAndCleaners, 'name');
      return `Close and ${action ? ` ${action} ${name}` : 'Shutdown'}`;
    },
    isEnabled:
      Private.delegateEnabled(app, menu.closeAndCleaners, 'closeAndCleanup'),
    execute:
      Private.delegateExecute(app, menu.closeAndCleaners, 'closeAndCleanup')
  });

  // Add a delegator command for creating a console for an activity.
  commands.addCommand(CommandIDs.createConsole, {
    label: () => {
      const name = Private.delegateLabel(app, menu.consoleCreators, 'name');
      const label = `New Console for ${name ? name : 'Activity' }`;
      return label;
    },
    isEnabled: Private.delegateEnabled(app, menu.consoleCreators, 'createConsole'),
    execute: Private.delegateExecute(app, menu.consoleCreators, 'createConsole')
  });

  // Add the new group
  const newGroup = [
    { type: 'submenu' as Menu.ItemType, submenu: menu.newMenu.menu },
    { command: 'filebrowser:create-main-launcher' },
  ];

  const newViewGroup = [
    { command: 'docmanager:clone' },
    { command: CommandIDs.createConsole }
  ];

  // Add the close group
  const closeGroup = [
    'docmanager:close',
    'filemenu:close-and-cleanup',
    'docmanager:close-all-files'
  ].map(command => { return { command }; });

  // Add save group.
  const saveGroup = [
    'docmanager:save',
    'docmanager:save-as',
    'docmanager:save-all'
  ].map(command => { return { command }; });

  // Add the re group.
  const reGroup = [
    'docmanager:restore-checkpoint',
    'docmanager:rename'
  ].map(command => { return { command }; });

  menu.addGroup(newGroup, 0);
  menu.addGroup(newViewGroup, 1);
  menu.addGroup(closeGroup, 2);
  menu.addGroup(saveGroup, 3);
  menu.addGroup(reGroup, 4);
}

/**
 * Create the basic `Kernel` menu.
 */
function createKernelMenu(app: JupyterLab, menu: KernelMenu): void {
  const commands = menu.menu.commands;

  commands.addCommand(CommandIDs.interruptKernel, {
    label: 'Interrupt Kernel',
    isEnabled: Private.delegateEnabled(app, menu.kernelUsers, 'interruptKernel'),
    execute: Private.delegateExecute(app, menu.kernelUsers, 'interruptKernel')
  });

  commands.addCommand(CommandIDs.restartKernel, {
    label: 'Restart Kernel…',
    isEnabled: Private.delegateEnabled(app, menu.kernelUsers, 'restartKernel'),
    execute: Private.delegateExecute(app, menu.kernelUsers, 'restartKernel')
  });

  commands.addCommand(CommandIDs.restartKernelAndClear, {
    label: () => {
      const noun = Private.delegateLabel(app, menu.kernelUsers, 'noun');
      const enabled =
        Private.delegateEnabled(app, menu.kernelUsers, 'restartKernelAndClear')();
      return `Restart Kernel and Clear${enabled ? ` ${noun}` : ''}…`;
    },
    isEnabled:
      Private.delegateEnabled(app, menu.kernelUsers, 'restartKernelAndClear'),
    execute:
      Private.delegateExecute(app, menu.kernelUsers, 'restartKernelAndClear')
  });

  commands.addCommand(CommandIDs.changeKernel, {
    label: 'Change Kernel…',
    isEnabled: Private.delegateEnabled(app, menu.kernelUsers, 'changeKernel'),
    execute: Private.delegateExecute(app, menu.kernelUsers, 'changeKernel')
  });

  commands.addCommand(CommandIDs.shutdownKernel, {
    label: 'Shutdown Kernel',
    isEnabled: Private.delegateEnabled(app, menu.kernelUsers, 'shutdownKernel'),
    execute: Private.delegateExecute(app, menu.kernelUsers, 'shutdownKernel')
  });

  const restartGroup = [
    CommandIDs.restartKernel,
    CommandIDs.restartKernelAndClear,
    CommandIDs.restartAndRunAll,
  ].map(command => { return { command }; });

  menu.addGroup([{ command: CommandIDs.interruptKernel }], 0);
  menu.addGroup(restartGroup, 1);
  menu.addGroup([{ command: CommandIDs.shutdownKernel }], 2);
  menu.addGroup([{ command: CommandIDs.changeKernel }], 3);
}

/**
 * Create the basic `View` menu.
 */
function createViewMenu(app: JupyterLab, menu: ViewMenu): void {
  const commands = menu.menu.commands;

  commands.addCommand(CommandIDs.lineNumbering, {
    label: 'Show Line Numbers',
    isEnabled: Private.delegateEnabled(app, menu.editorViewers, 'toggleLineNumbers'),
    isToggled: Private.delegateToggled(app, menu.editorViewers, 'lineNumbersToggled'),
    execute: Private.delegateExecute(app, menu.editorViewers, 'toggleLineNumbers')
  });

  commands.addCommand(CommandIDs.matchBrackets, {
    label: 'Match Brackets',
    isEnabled: Private.delegateEnabled(app, menu.editorViewers, 'toggleMatchBrackets'),
    isToggled: Private.delegateToggled(app, menu.editorViewers, 'matchBracketsToggled'),
    execute: Private.delegateExecute(app, menu.editorViewers, 'toggleMatchBrackets')
  });

  commands.addCommand(CommandIDs.wordWrap, {
    label: 'Wrap Words',
    isEnabled: Private.delegateEnabled(app, menu.editorViewers, 'toggleWordWrap'),
    isToggled: Private.delegateToggled(app, menu.editorViewers, 'wordWrapToggled'),
    execute: Private.delegateExecute(app, menu.editorViewers, 'toggleWordWrap')
  });

  menu.addGroup([
    { command: 'application:toggle-left-area' },
    { command: 'application:toggle-right-area' }
  ], 0);

  const editorViewerGroup = [
    CommandIDs.lineNumbering,
    CommandIDs.matchBrackets,
    CommandIDs.wordWrap
  ].map( command => { return { command }; });
  menu.addGroup(editorViewerGroup, 10);

  // Add the command for toggling single-document mode.
  menu.addGroup([{ command: 'application:toggle-mode' }], 1000);
}

function createRunMenu(app: JupyterLab, menu: RunMenu): void {
  const commands = menu.menu.commands;

  commands.addCommand(CommandIDs.run, {
    label: () => {
      const noun = Private.delegateLabel(app, menu.codeRunners, 'noun');
      const enabled =
        Private.delegateEnabled(app, menu.codeRunners, 'run')();
      return `Run Selected${enabled ? ` ${noun}` : ''}`;
    },
    isEnabled: Private.delegateEnabled(app, menu.codeRunners, 'run'),
    execute: Private.delegateExecute(app, menu.codeRunners, 'run')
  });

  commands.addCommand(CommandIDs.runAll, {
    label: () => {
      const noun = Private.delegateLabel(app, menu.codeRunners, 'noun');
      const enabled =
        Private.delegateEnabled(app, menu.codeRunners, 'runAll')();
      return `Run All${enabled ? ` ${noun}` : ''}`;
    },
    isEnabled: Private.delegateEnabled(app, menu.codeRunners, 'runAll'),
    execute: Private.delegateExecute(app, menu.codeRunners, 'runAll')
  });

  commands.addCommand(CommandIDs.restartAndRunAll, {
    label: () => {
      const noun = Private.delegateLabel(app, menu.codeRunners, 'noun');
      const enabled =
        Private.delegateEnabled(app, menu.codeRunners, 'restartAndRunAll')();
      return `Restart Kernel and Run All${enabled ? ` ${noun}` : ''}…`;
    },
    isEnabled: Private.delegateEnabled(app, menu.codeRunners, 'restartAndRunAll'),
    execute: Private.delegateExecute(app, menu.codeRunners, 'restartAndRunAll')
  });

  const runAllGroup = [
    CommandIDs.runAll,
    CommandIDs.restartAndRunAll
  ].map( command => { return { command }; });

  menu.addGroup([{ command: CommandIDs.run }], 0);
  menu.addGroup(runAllGroup, 999);
}

function createSettingsMenu(app: JupyterLab, menu: SettingsMenu): void {
  menu.addGroup([{ command: 'settingeditor:open' }], 1000);
}
function createTabsMenu(app: JupyterLab, menu: TabsMenu): void {
  const commands = app.commands;

  // Add commands for cycling the active tabs.
  menu.addGroup([
    { command: 'application:activate-next-tab' },
    { command: 'application:activate-previous-tab' }
  ], 0);


  let tabGroup: Menu.IItemOptions[] = [];

  // Utility function to create a command to activate
  // a given tab, or get it if it already exists.
  const createMenuItem = (widget: Widget): Menu.IItemOptions => {
    const commandID = `tabmenu:activate-${widget.id}`;
    if (!commands.hasCommand(commandID)) {
      commands.addCommand(commandID, {
        label: () => widget.title.label,
        isVisible: () => !widget.isDisposed,
        isEnabled: () => !widget.isDisposed,
        isToggled: () => app.shell.currentWidget === widget,
        execute: () => app.shell.activateById(widget.id)
      });
    }
    return { command: commandID };
  };

  app.restored.then(() => {
    // Iterate over the current widgets in the
    // main area, and add them to the tab group
    // of the menu.
    const populateTabs = () => {
      menu.removeGroup(tabGroup);
      tabGroup.length = 0;
      each(app.shell.widgets('main'), widget => {
        tabGroup.push(createMenuItem(widget));
      });
      menu.addGroup(tabGroup, 1);
    };
    populateTabs();
    app.shell.layoutModified.connect(() => { populateTabs(); });
  });
}

export default menuPlugin;

/**
 * A namespace for Private data.
 */
namespace Private {
  /**
   * Given a widget and a set containing IMenuExtenders,
   * check the tracker and return the extender, if any,
   * that holds the widget.
   */
  function findExtender<E extends IMenuExtender<Widget>>(widget: Widget, s: Set<E>): E {
    let extender: E;
    s.forEach(value => {
      if (value.tracker.has(widget)) {
        extender = value;
      }
    });
    return extender;
  }

  /**
   * A utility function that delegates a portion of a label to an IMenuExtender.
   */
  export
  function delegateLabel<E extends IMenuExtender<Widget>>(app: JupyterLab, s: Set<E>, label: keyof E): string {
    let widget = app.shell.currentWidget;
    const extender = findExtender(widget, s);
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
  function delegateExecute<E extends IMenuExtender<Widget>>(app: JupyterLab, s: Set<E>, executor: keyof E): () => Promise<any> {
    return () => {
      let widget = app.shell.currentWidget;
      const extender = findExtender(widget, s);
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
  function delegateEnabled<E extends IMenuExtender<Widget>>(app: JupyterLab, s: Set<E>, executor: keyof E): () => boolean {
    return () => {
      let widget = app.shell.currentWidget;
      const extender = findExtender(widget, s);
      return !!extender && !!extender[executor] &&
        (extender.isEnabled ? extender.isEnabled(widget) : true);
    };
  }

  /**
   * A utility function that delegates whether a command is toggled
   * for an IMenuExtender.
   */
  export
  function delegateToggled<E extends IMenuExtender<Widget>>(app: JupyterLab, s: Set<E>, toggled: keyof E): () => boolean {
    return () => {
      let widget = app.shell.currentWidget;
      const extender = findExtender(widget, s);
      return !!extender && !!extender[toggled] && !!extender[toggled](widget);
    };
  }
}
