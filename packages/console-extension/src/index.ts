// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ILayoutRestorer, JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  Dialog, ICommandPalette, InstanceTracker, showDialog
} from '@jupyterlab/apputils';

import {
  IEditorServices
} from '@jupyterlab/codeeditor';

import {
  ConsolePanel, IConsoleTracker
} from '@jupyterlab/console';

import {
  PageConfig
} from '@jupyterlab/coreutils';

import {
  IFileBrowserFactory
} from '@jupyterlab/filebrowser';

import {
  ILauncher
} from '@jupyterlab/launcher';

import {
  IEditMenu, IFileMenu, IHelpMenu, IKernelMenu, IMainMenu, IRunMenu
} from '@jupyterlab/mainmenu';

import {
  IRenderMimeRegistry
} from '@jupyterlab/rendermime';

import {
  find
} from '@phosphor/algorithm';

import {
  ReadonlyJSONObject
} from '@phosphor/coreutils';

import {
  DockLayout
} from '@phosphor/widgets';


/**
 * The command IDs used by the console plugin.
 */
namespace CommandIDs {
  export
  const create = 'console:create';

  export
  const clear = 'console:clear';

  export
  const runUnforced = 'console:run-unforced';

  export
  const runForced = 'console:run-forced';

  export
  const linebreak = 'console:linebreak';

  export
  const interrupt = 'console:interrupt-kernel';

  export
  const restart = 'console:restart-kernel';

  export
  const closeAndShutdown = 'console:close-and-shutdown';

  export
  const open = 'console:open';

  export
  const inject = 'console:inject';

  export
  const changeKernel = 'console:change-kernel';
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
    IRenderMimeRegistry
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
function activateConsole(app: JupyterLab, mainMenu: IMainMenu, palette: ICommandPalette, contentFactory: ConsolePanel.IContentFactory,  editorServices: IEditorServices, restorer: ILayoutRestorer, browserFactory: IFileBrowserFactory, rendermime: IRenderMimeRegistry, launcher: ILauncher | null): IConsoleTracker {
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

  // The launcher callback.
  let callback = (cwd: string, name: string) => {
    return createConsole({ basePath: cwd, kernelPreference: { name } });
  };

  // Add a launcher item if the launcher is available.
  if (launcher) {
    manager.ready.then(() => {
      const specs = manager.specs;
      if (!specs) {
        return;
      }
      let baseUrl = PageConfig.getBaseUrl();
      for (let name in specs.kernelspecs) {
        let displayName = specs.kernelspecs[name].display_name;
        let rank = name === specs.default ? 0 : Infinity;
        let kernelIconUrl = specs.kernelspecs[name].resources['logo-64x64'];
        if (kernelIconUrl) {
          let index = kernelIconUrl.indexOf('kernelspecs');
          kernelIconUrl = baseUrl + kernelIconUrl.slice(index);
        }
        launcher.add({
          displayName,
          category: 'Console',
          name,
          iconClass: 'jp-CodeConsoleIcon',
          callback,
          rank,
          kernelIconUrl
        });
      }
    });
  }

  interface ICreateOptions extends Partial<ConsolePanel.IOptions> {
    ref?: string;
    insertMode?: DockLayout.InsertMode;
  }

  /**
   * Create a console for a given path.
   */
  function createConsole(options: ICreateOptions): Promise<ConsolePanel> {
    let panel: ConsolePanel;
    return manager.ready.then(() => {
      panel = new ConsolePanel({
        manager,
        contentFactory,
        mimeTypeService: editorServices.mimeTypeService,
        rendermime,
        ...options as Partial<ConsolePanel.IOptions>
      });

      return panel.session.ready;
    }).then(() => {
      // Add the console panel to the tracker.
      tracker.add(panel);
      shell.addToMainArea(
        panel, {
          ref: options.ref || null, mode: options.insertMode || 'tab-after'
        }
      );
      shell.activateById(panel.id);
      return panel;
    });
  }

  /**
   * Whether there is an active console.
   */
  function isEnabled(): boolean {
    return tracker.currentWidget !== null
           && tracker.currentWidget === app.shell.currentWidget;
  }

  let command = CommandIDs.open;
  commands.addCommand(command, {
    execute: (args: Partial<ConsolePanel.IOptions>) => {
      let path = args['path'];
      let widget = tracker.find(value => {
        return value.console.session.path === path;
      });
      if (widget) {
        shell.activateById(widget.id);
      } else {
        return manager.ready.then(() => {
          let model = find(manager.sessions.running(), item => {
            return item.path === path;
          });
          if (model) {
            return createConsole(args);
          }
          return Promise.reject(`No running console for path: ${path}`);
        });
      }
    },
  });

  command = CommandIDs.create;
  commands.addCommand(command, {
    label: args => args['isPalette'] ? 'New Console' : 'Console',
    execute: (args: Partial<ConsolePanel.IOptions>) => {
      let basePath = args.basePath || browserFactory.defaultBrowser.model.path;
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
  ].forEach(command => {
    palette.addItem({ command, category, args: { 'isPalette': true } });
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
      current.console.clear();
      return current.console.session.restart();
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
    clearCurrent: (current: ConsolePanel) => { return current.console.clear(); }
  } as IEditMenu.IClearer<ConsolePanel>);

  // Add kernel information to the application help menu.
  mainMenu.helpMenu.kernelUsers.add({
    tracker,
    getKernel: current => current.session.kernel
  } as IHelpMenu.IKernelUser<ConsolePanel>);

  app.contextMenu.addItem({command: CommandIDs.clear, selector: '.jp-CodeConsole-content'});
  app.contextMenu.addItem({command: CommandIDs.restart, selector: '.jp-CodeConsole'});

  return tracker;
}
