// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer,
  JupyterLab,
  JupyterLabPlugin
} from '@jupyterlab/application';

import {
  Dialog,
  IClientSession,
  ICommandPalette,
  InstanceTracker,
  showDialog
} from '@jupyterlab/apputils';

import { IEditorServices } from '@jupyterlab/codeeditor';

import { ConsolePanel, IConsoleTracker } from '@jupyterlab/console';

import { ISettingRegistry, PageConfig } from '@jupyterlab/coreutils';

import { IFileBrowserFactory } from '@jupyterlab/filebrowser';

import { ILauncher } from '@jupyterlab/launcher';

import {
  IEditMenu,
  IFileMenu,
  IHelpMenu,
  IKernelMenu,
  IMainMenu,
  IRunMenu
} from '@jupyterlab/mainmenu';

import { IRenderMimeRegistry } from '@jupyterlab/rendermime';

import { find } from '@phosphor/algorithm';

import { JSONExt, ReadonlyJSONObject } from '@phosphor/coreutils';

import { DockLayout, Menu } from '@phosphor/widgets';

/**
 * The command IDs used by the console plugin.
 */
namespace CommandIDs {
  export const create = 'console:create';

  export const clear = 'console:clear';

  export const runUnforced = 'console:run-unforced';

  export const runForced = 'console:run-forced';

  export const linebreak = 'console:linebreak';

  export const interrupt = 'console:interrupt-kernel';

  export const restart = 'console:restart-kernel';

  export const closeAndShutdown = 'console:close-and-shutdown';

  export const open = 'console:open';

  export const inject = 'console:inject';

  export const changeKernel = 'console:change-kernel';

  export const toggleShowAllActivity =
    'console:toggle-show-all-kernel-activity';

  export const enterToExecute = 'console:enter-to-execute';

  export const shiftEnterToExecute = 'console:shift-enter-to-execute';
}

/**
 * The console widget tracker provider.
 */
const tracker: JupyterLabPlugin<IConsoleTracker> = {
  id: '@jupyterlab/console-extension:tracker',
  provides: IConsoleTracker,
  requires: [
    IMainMenu,
    ICommandPalette,
    ConsolePanel.IContentFactory,
    IEditorServices,
    ILayoutRestorer,
    IFileBrowserFactory,
    IRenderMimeRegistry,
    ISettingRegistry
  ],
  optional: [ILauncher],
  activate: activateConsole,
  autoStart: true
};

/**
 * The console widget content factory.
 */
const factory: JupyterLabPlugin<ConsolePanel.IContentFactory> = {
  id: '@jupyterlab/console-extension:factory',
  provides: ConsolePanel.IContentFactory,
  requires: [IEditorServices],
  autoStart: true,
  activate: (app: JupyterLab, editorServices: IEditorServices) => {
    const editorFactory = editorServices.factoryService.newInlineEditor;
    return new ConsolePanel.ContentFactory({ editorFactory });
  }
};

/**
 * Export the plugins as the default.
 */
const plugins: JupyterLabPlugin<any>[] = [factory, tracker];
export default plugins;

/**
 * Activate the console extension.
 */
function activateConsole(
  app: JupyterLab,
  mainMenu: IMainMenu,
  palette: ICommandPalette,
  contentFactory: ConsolePanel.IContentFactory,
  editorServices: IEditorServices,
  restorer: ILayoutRestorer,
  browserFactory: IFileBrowserFactory,
  rendermime: IRenderMimeRegistry,
  settingRegistry: ISettingRegistry,
  launcher: ILauncher | null
): IConsoleTracker {
  const manager = app.serviceManager;
  const { commands, shell } = app;
  const category = 'Console';

  // Create an instance tracker for all console panels.
  const tracker = new InstanceTracker<ConsolePanel>({ namespace: 'console' });

  // Handle state restoration.
  restorer.restore(tracker, {
    command: CommandIDs.open,
    args: panel => ({
      path: panel.console.session.path,
      name: panel.console.session.name
    }),
    name: panel => panel.console.session.path,
    when: manager.ready
  });

  // Add a launcher item if the launcher is available.
  if (launcher) {
    manager.ready.then(() => {
      const specs = manager.specs;
      if (!specs) {
        return;
      }
      let baseUrl = PageConfig.getBaseUrl();
      for (let name in specs.kernelspecs) {
        let rank = name === specs.default ? 0 : Infinity;
        let kernelIconUrl = specs.kernelspecs[name].resources['logo-64x64'];
        if (kernelIconUrl) {
          let index = kernelIconUrl.indexOf('kernelspecs');
          kernelIconUrl = baseUrl + kernelIconUrl.slice(index);
        }
        launcher.add({
          command: CommandIDs.create,
          args: { isLauncher: true, kernelPreference: { name } },
          category: 'Console',
          rank,
          kernelIconUrl
        });
      }
    });
  }

  /**
   * The options used to create a widget.
   */
  interface ICreateOptions extends Partial<ConsolePanel.IOptions> {
    /**
     * The reference widget id for the insert location.
     *
     * The default is `null`.
     */
    ref?: string | null;

    /**
     * The tab insert mode.
     *
     * An insert mode is used to specify how a widget should be added
     * to the main area relative to a reference widget.
     */
    insertMode?: DockLayout.InsertMode;

    /**
     * Whether to activate the widget.  Defaults to `true`.
     */
    activate?: boolean;
  }

  /**
   * Create a console for a given path.
   */
  function createConsole(options: ICreateOptions): Promise<ConsolePanel> {
    let panel: ConsolePanel;
    return manager.ready
      .then(() => {
        panel = new ConsolePanel({
          manager,
          contentFactory,
          mimeTypeService: editorServices.mimeTypeService,
          rendermime,
          setBusy: app.setBusy.bind(app),
          ...(options as Partial<ConsolePanel.IOptions>)
        });

        return panel.session.ready;
      })
      .then(() => {
        // Add the console panel to the tracker.
        tracker.add(panel);
        panel.session.propertyChanged.connect(() => tracker.save(panel));

        shell.addToMainArea(panel, {
          ref: options.ref,
          mode: options.insertMode,
          activate: options.activate
        });
        return panel;
      });
  }

  /**
   * Whether there is an active console.
   */
  function isEnabled(): boolean {
    return (
      tracker.currentWidget !== null &&
      tracker.currentWidget === app.shell.currentWidget
    );
  }

  /**
   * The options used to open a console.
   */
  interface IOpenOptions extends Partial<ConsolePanel.IOptions> {
    /**
     * Whether to activate the console.  Defaults to `true`.
     */
    activate?: boolean;
  }

  let command = CommandIDs.open;
  commands.addCommand(command, {
    execute: (args: IOpenOptions) => {
      let path = args['path'];
      let widget = tracker.find(value => {
        return value.console.session.path === path;
      });
      if (widget) {
        if (args['activate'] !== false) {
          shell.activateById(widget.id);
        }
        return widget;
      } else {
        return manager.ready.then(() => {
          let model = find(manager.sessions.running(), item => {
            return item.path === path;
          });
          if (model) {
            return createConsole(args);
          }
          return Promise.reject(`No running kernel session for path: ${path}`);
        });
      }
    }
  });

  command = CommandIDs.create;
  commands.addCommand(command, {
    label: args => {
      if (args['isPalette']) {
        return 'New Console';
      } else if (args['isLauncher'] && args['kernelPreference']) {
        const kernelPreference = args[
          'kernelPreference'
        ] as IClientSession.IKernelPreference;
        return manager.specs.kernelspecs[kernelPreference.name].display_name;
      }
      return 'Console';
    },
    iconClass: args => (args['isPalette'] ? '' : 'jp-CodeConsoleIcon'),
    execute: args => {
      let basePath =
        (args['basePath'] as string) ||
        (args['cwd'] as string) ||
        browserFactory.defaultBrowser.model.path;
      return createConsole({ basePath, ...args });
    }
  });

  // Get the current widget and activate unless the args specify otherwise.
  function getCurrent(args: ReadonlyJSONObject): ConsolePanel | null {
    let widget = tracker.currentWidget;
    let activate = args['activate'] !== false;
    if (activate && widget) {
      shell.activateById(widget.id);
    }
    return widget;
  }

  commands.addCommand(CommandIDs.clear, {
    label: 'Clear Console Cells',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      current.console.clear();
    },
    isEnabled
  });

  commands.addCommand(CommandIDs.runUnforced, {
    label: 'Run Cell (unforced)',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return current.console.execute();
    },
    isEnabled
  });

  commands.addCommand(CommandIDs.runForced, {
    label: 'Run Cell (forced)',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      current.console.execute(true);
    },
    isEnabled
  });

  commands.addCommand(CommandIDs.linebreak, {
    label: 'Insert Line Break',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      current.console.insertLinebreak();
    },
    isEnabled
  });

  commands.addCommand(CommandIDs.interrupt, {
    label: 'Interrupt Kernel',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      let kernel = current.console.session.kernel;
      if (kernel) {
        return kernel.interrupt();
      }
    },
    isEnabled
  });

  commands.addCommand(CommandIDs.restart, {
    label: 'Restart Kernel…',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return current.console.session.restart();
    },
    isEnabled
  });

  commands.addCommand(CommandIDs.closeAndShutdown, {
    label: 'Close and Shutdown…',
    execute: args => {
      const current = getCurrent(args);
      if (!current) {
        return;
      }
      return showDialog({
        title: 'Shutdown the console?',
        body: `Are you sure you want to close "${current.title.label}"?`,
        buttons: [Dialog.cancelButton(), Dialog.warnButton()]
      }).then(result => {
        if (result.button.accept) {
          current.console.session.shutdown().then(() => {
            current.dispose();
          });
        } else {
          return false;
        }
      });
    },
    isEnabled
  });

  commands.addCommand(CommandIDs.inject, {
    execute: args => {
      let path = args['path'];
      tracker.find(widget => {
        if (widget.console.session.path === path) {
          if (args['activate'] !== false) {
            shell.activateById(widget.id);
          }
          widget.console.inject(args['code'] as string);
          return true;
        }
        return false;
      });
    },
    isEnabled
  });

  commands.addCommand(CommandIDs.changeKernel, {
    label: 'Change Kernel…',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return current.console.session.selectKernel();
    },
    isEnabled
  });

  commands.addCommand(CommandIDs.toggleShowAllActivity, {
    label: args => 'Show All Kernel Activity',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      current.console.showAllActivity = !current.console.showAllActivity;
    },
    isToggled: () =>
      tracker.currentWidget
        ? tracker.currentWidget.console.showAllActivity
        : false,
    isEnabled
  });

  // Constants for setting the shortcuts for executing console cells.
  const shortcutPlugin = '@jupyterlab/shortcuts-extension:plugin';
  const selector = '.jp-CodeConsole-promptCell';

  // Keep updated keybindings for the console commands related to execution.
  let linebreak = find(
    commands.keyBindings,
    kb => kb.command === CommandIDs.linebreak
  );
  let runUnforced = find(
    commands.keyBindings,
    kb => kb.command === CommandIDs.runUnforced
  );
  let runForced = find(
    commands.keyBindings,
    kb => kb.command === CommandIDs.runForced
  );
  commands.keyBindingChanged.connect((s, args) => {
    if (args.binding.command === CommandIDs.linebreak) {
      linebreak = args.type === 'added' ? args.binding : undefined;
      return;
    }
    if (args.binding.command === CommandIDs.runUnforced) {
      runUnforced = args.type === 'added' ? args.binding : undefined;
      return;
    }
    if (args.binding.command === CommandIDs.runForced) {
      runForced = args.type === 'added' ? args.binding : undefined;
      return;
    }
  });

  commands.addCommand(CommandIDs.shiftEnterToExecute, {
    label: 'Execute with Shift+Enter',
    isToggled: () => {
      // Only show as toggled if the shortcuts are strictly
      // The Shift+Enter ones.
      return (
        linebreak &&
        JSONExt.deepEqual(linebreak.keys, ['Enter']) &&
        runUnforced === undefined &&
        runForced &&
        JSONExt.deepEqual(runForced.keys, ['Shift Enter'])
      );
    },
    execute: () => {
      const first = settingRegistry.set(shortcutPlugin, CommandIDs.linebreak, {
        command: CommandIDs.linebreak,
        keys: ['Enter'],
        selector
      });
      const second = settingRegistry.remove(
        shortcutPlugin,
        CommandIDs.runUnforced
      );
      const third = settingRegistry.set(shortcutPlugin, CommandIDs.runForced, {
        command: CommandIDs.runForced,
        keys: ['Shift Enter'],
        selector
      });

      return Promise.all([first, second, third]);
    }
  });

  commands.addCommand(CommandIDs.enterToExecute, {
    label: 'Execute with Enter',
    isToggled: () => {
      // Only show as toggled if the shortcuts are strictly
      // The Enter ones.
      return (
        linebreak &&
        JSONExt.deepEqual(linebreak.keys, ['Ctrl Enter']) &&
        runUnforced &&
        JSONExt.deepEqual(runUnforced.keys, ['Enter']) &&
        runForced &&
        JSONExt.deepEqual(runForced.keys, ['Shift Enter'])
      );
    },
    execute: () => {
      const first = settingRegistry.set(shortcutPlugin, CommandIDs.linebreak, {
        command: CommandIDs.linebreak,
        keys: ['Ctrl Enter'],
        selector
      });
      const second = settingRegistry.set(
        shortcutPlugin,
        CommandIDs.runUnforced,
        {
          command: CommandIDs.runUnforced,
          keys: ['Enter'],
          selector
        }
      );
      const third = settingRegistry.set(shortcutPlugin, CommandIDs.runForced, {
        command: CommandIDs.runForced,
        keys: ['Shift Enter'],
        selector
      });

      return Promise.all([first, second, third]);
    }
  });

  // Add command palette items
  [
    CommandIDs.create,
    CommandIDs.linebreak,
    CommandIDs.clear,
    CommandIDs.runUnforced,
    CommandIDs.runForced,
    CommandIDs.restart,
    CommandIDs.interrupt,
    CommandIDs.changeKernel,
    CommandIDs.closeAndShutdown,
    CommandIDs.toggleShowAllActivity
  ].forEach(command => {
    palette.addItem({ command, category, args: { isPalette: true } });
  });

  // Add a console creator to the File menu
  mainMenu.fileMenu.newMenu.addGroup([{ command: CommandIDs.create }], 0);

  // Add a close and shutdown command to the file menu.
  mainMenu.fileMenu.closeAndCleaners.add({
    tracker,
    action: 'Shutdown',
    name: 'Console',
    closeAndCleanup: (current: ConsolePanel) => {
      return showDialog({
        title: 'Shutdown the console?',
        body: `Are you sure you want to close "${current.title.label}"?`,
        buttons: [Dialog.cancelButton(), Dialog.warnButton()]
      }).then(result => {
        if (result.button.accept) {
          current.console.session.shutdown().then(() => {
            current.dispose();
          });
        } else {
          return void 0;
        }
      });
    }
  } as IFileMenu.ICloseAndCleaner<ConsolePanel>);

  // Add a kernel user to the Kernel menu
  mainMenu.kernelMenu.kernelUsers.add({
    tracker,
    interruptKernel: current => {
      let kernel = current.console.session.kernel;
      if (kernel) {
        return kernel.interrupt();
      }
      return Promise.resolve(void 0);
    },
    noun: 'Console',
    restartKernel: current => current.console.session.restart(),
    restartKernelAndClear: current => {
      return current.console.session.restart().then(restarted => {
        if (restarted) {
          current.console.clear();
        }
        return restarted;
      });
    },
    changeKernel: current => current.console.session.selectKernel(),
    shutdownKernel: current => current.console.session.shutdown()
  } as IKernelMenu.IKernelUser<ConsolePanel>);

  // Add a code runner to the Run menu.
  mainMenu.runMenu.codeRunners.add({
    tracker,
    noun: 'Cell',
    pluralNoun: 'Cells',
    run: current => current.console.execute(true)
  } as IRunMenu.ICodeRunner<ConsolePanel>);

  // Add a clearer to the edit menu
  mainMenu.editMenu.clearers.add({
    tracker,
    noun: 'Console Cells',
    clearCurrent: (current: ConsolePanel) => {
      return current.console.clear();
    }
  } as IEditMenu.IClearer<ConsolePanel>);

  // Add the execute keystroke setting submenu.
  const executeMenu = new Menu({ commands });
  executeMenu.title.label = 'Console Run Keystroke';
  executeMenu.addItem({ command: CommandIDs.enterToExecute });
  executeMenu.addItem({ command: CommandIDs.shiftEnterToExecute });
  mainMenu.settingsMenu.addGroup(
    [
      {
        type: 'submenu' as Menu.ItemType,
        submenu: executeMenu
      }
    ],
    10
  );

  // Add kernel information to the application help menu.
  mainMenu.helpMenu.kernelUsers.add({
    tracker,
    getKernel: current => current.session.kernel
  } as IHelpMenu.IKernelUser<ConsolePanel>);

  app.contextMenu.addItem({
    command: CommandIDs.clear,
    selector: '.jp-CodeConsole-content'
  });
  app.contextMenu.addItem({
    command: CommandIDs.restart,
    selector: '.jp-CodeConsole'
  });
  app.contextMenu.addItem({
    command: CommandIDs.toggleShowAllActivity,
    selector: '.jp-CodeConsole'
  });

  return tracker;
}
