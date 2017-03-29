// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IServiceManager, Kernel, Session
} from '@jupyterlab/services';

import {
  JSONObject
} from '@phosphor/coreutils';

import {
  Menu
} from '@phosphor/widgets';

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  Dialog, ICommandPalette, InstanceTracker, ILayoutRestorer,
  IMainMenu, showDialog
} from '@jupyterlab/apputils';

import {
  IEditorServices
} from '@jupyterlab/codeeditor';

import {
  PathExt, Time, uuid
} from '@jupyterlab/coreutils';

import {
  IConsoleTracker, ICreateConsoleArgs, ConsolePanel
} from '@jupyterlab/console';

import {
  IPathTracker
} from '@jupyterlab/filebrowser';

import {
  ILauncher
} from '@jupyterlab/launcher';

import {
  IRenderMime, RenderMime
} from '@jupyterlab/rendermime';


/**
 * The command IDs used by the console plugin.
 */
namespace CommandIDs {
  export
  const create = 'console:create';

  export
  const clear = 'console:clear';

  export
  const run = 'console:run';

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
  const switchKernel = 'console:switch-kernel';
};

/**
 * The console widget tracker provider.
 */
export
const trackerPlugin: JupyterLabPlugin<IConsoleTracker> = {
  id: 'jupyter.services.console-tracker',
  provides: IConsoleTracker,
  requires: [
    IServiceManager,
    IRenderMime,
    IMainMenu,
    ICommandPalette,
    IPathTracker,
    ConsolePanel.IContentFactory,
    IEditorServices,
    ILayoutRestorer
  ],
  optional: [ILauncher],
  activate: activateConsole,
  autoStart: true
};


/**
 * The console widget content factory.
 */
export
const contentFactoryPlugin: JupyterLabPlugin<ConsolePanel.IContentFactory> = {
  id: 'jupyter.services.console-renderer',
  provides: ConsolePanel.IContentFactory,
  requires: [IEditorServices],
  autoStart: true,
  activate: (app: JupyterLab, editorServices: IEditorServices) => {
    let editorFactory = editorServices.factoryService.newInlineEditor.bind(
      editorServices.factoryService);
    return new ConsolePanel.ContentFactory({ editorFactory });
  }
};


/**
 * Export the plugins as the default.
 */
const plugins: JupyterLabPlugin<any>[] = [contentFactoryPlugin, trackerPlugin];
export default plugins;


/**
 * The class name for the console icon from the default theme.
 */
const CONSOLE_ICON_CLASS = 'jp-ImageCodeConsole';

/**
 * A regex for console names.
 */
const CONSOLE_REGEX = /^console-(\d)+-[0-9a-f]+$/;


/**
 * Activate the console extension.
 */
function activateConsole(app: JupyterLab, services: IServiceManager, rendermime: IRenderMime, mainMenu: IMainMenu, palette: ICommandPalette, pathTracker: IPathTracker, contentFactory: ConsolePanel.IContentFactory,  editorServices: IEditorServices, restorer: ILayoutRestorer, launcher: ILauncher | null): IConsoleTracker {
  let manager = services.sessions;
  let { commands, shell } = app;
  let category = 'Console';
  let command: string;
  let menu = new Menu({ commands });

  // Create an instance tracker for all console panels.
  const tracker = new InstanceTracker<ConsolePanel>({
    namespace: 'console',
    shell
  });

  // Handle state restoration.
  restorer.restore(tracker, {
    command: CommandIDs.create,
    args: panel => ({ id: panel.console.session.id }),
    name: panel => panel.console.session && panel.console.session.id,
    when: manager.ready
  });

  // Add a launcher item if the launcher is available.
  if (launcher) {
    launcher.add({
      name: 'Code Console',
      command: CommandIDs.create
    });
  }

  // Set the main menu title.
  menu.title.label = category;

  command = CommandIDs.create;
  commands.addCommand(command, {
    label: 'Start New Console',
    execute: (args?: ICreateConsoleArgs) => {
      let name = `Console ${++count}`;

      args = args || {};

      // If we get a session, use it.
      if (args.path) {

        return manager.ready.then(() => manager.connectTo(args.id))
          .then(session => {
            name = session.path.split('/').pop();
            name = `Console ${name.match(CONSOLE_REGEX)[1]}`;
            createConsole(session, name);
            return session.id;
          });
      }

      // Find the correct path for the new session.
      // Use the given path or the cwd.
      let path = args.path || pathTracker.path;
      if (PathExt.extname(path)) {
        path = PathExt.dirname(path);
      }
      path = `${path}/console-${count}-${uuid()}`;

      // Get the kernel model.
      return manager.ready.then(() => getKernel(args, name)).then(kernel => {
        if (!kernel || (kernel && !kernel.id && !kernel.name)) {
          return;
        }
        // Start the session.
        let options: Session.IOptions = {
          path,
          kernelName: kernel.name,
          kernelId: kernel.id
        };
        return manager.startNew(options).then(session => {
          createConsole(session, name);
          return session.id;
        });
      });
    }
  });
  palette.addItem({ command, category });

  // Get the current widget and activate unless the args specify otherwise.
  function getCurrent(args: JSONObject): ConsolePanel | null {
    let widget = tracker.currentWidget;
    let activate = args['activate'] !== false;
    if (activate && widget) {
      tracker.activate(widget);
    }
    return widget;
  }

  command = CommandIDs.clear;
  commands.addCommand(command, {
    label: 'Clear Cells',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      current.console.clear();
    }
  });
  palette.addItem({ command, category });

  command = CommandIDs.run;
  commands.addCommand(command, {
    label: 'Run Cell',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return current.console.execute();
    }
  });
  palette.addItem({ command, category });

  command = CommandIDs.runForced;
  commands.addCommand(command, {
    label: 'Run Cell (forced)',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      current.console.execute(true);
    }
  });
  palette.addItem({ command, category });

  command = CommandIDs.linebreak;
  commands.addCommand(command, {
    label: 'Insert Line Break',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      current.console.insertLinebreak();
    }
  });
  palette.addItem({ command, category });

  command = CommandIDs.interrupt;
  commands.addCommand(command, {
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
    }
  });
  palette.addItem({ command, category });

  command = CommandIDs.restart;
  commands.addCommand(command, {
    label: 'Restart Kernel',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      let kernel = current.console.session.kernel;
      if (kernel) {
        return kernel.restart();
      }
    }
  });
  palette.addItem({ command, category });

  command = CommandIDs.closeAndShutdown;
  commands.addCommand(command, {
    label: 'Close and Shutdown',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return showDialog({
        title: 'Shutdown the console?',
        body: `Are you sure you want to close "${current.title.label}"?`,
        buttons: [Dialog.cancelButton(), Dialog.warnButton()]
      }).then(result => {
        if (result.accept) {
          current.console.session.shutdown().then(() => {
            current.dispose();
          });
        } else {
          return false;
        }
    });
    }
  });

  command = CommandIDs.inject;
  commands.addCommand(command, {
    execute: (args: JSONObject) => {
      let path = args['path'];
      tracker.find(widget => {
        if (widget.console.session.path === path) {
          if (args['activate'] !== false) {
            tracker.activate(widget);
          }
          widget.console.inject(args['code'] as string);
          return true;
        }
      });
    }
  });

  command = CommandIDs.open;
  commands.addCommand(command, {
    execute: (args: JSONObject) => {
      let path = args['path'];
      let widget = tracker.find(value => {
        if (value.console.session.path === path) {
          return true;
        }
      });
      if (widget) {
        tracker.activate(widget);
      } else {
        app.commands.execute(CommandIDs.create, { path });
      }
    }
  });

  /**
   * Create a console for a given session.
   *
   * #### Notes
   * The manager must be ready before calling this function.
   */
  function createConsole(session: Session.ISession, name: string): void {
    let options = {
      rendermime: rendermime.clone(),
      session,
      contentFactory,
      mimeTypeService: editorServices.mimeTypeService
    };
    let panel = new ConsolePanel(options);

    // Add the console panel to the tracker.
    tracker.add(panel);
    shell.addToMainArea(panel);
    tracker.activate(panel);
  }

  command = CommandIDs.switchKernel;
  commands.addCommand(command, {
    label: 'Switch Kernel',
    execute: args => {
      let current = getCurrent(args);
      if (!current) {
        return;
      }
      return current.console.session.selectKernel();
    }
  });
  palette.addItem({ command, category });

  menu.addItem({ command: CommandIDs.run });
  menu.addItem({ command: CommandIDs.runForced });
  menu.addItem({ command: CommandIDs.linebreak });
  menu.addItem({ type: 'separator' });
  menu.addItem({ command: CommandIDs.clear });
  menu.addItem({ type: 'separator' });
  menu.addItem({ command: CommandIDs.interrupt });
  menu.addItem({ command: CommandIDs.restart });
  menu.addItem({ command: CommandIDs.switchKernel });
  menu.addItem({ type: 'separator' });
  menu.addItem({ command: CommandIDs.closeAndShutdown });

  mainMenu.addMenu(menu, {rank: 50});
  return tracker;
}
