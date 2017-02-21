// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ContentsManager, Kernel, Session, utils
} from '@jupyterlab/services';

import {
  JSONObject
} from '@phosphor/coreutils';

import {
  Menu
} from '@phosphor/widgets';

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  IEditorServices
} from '../codeeditor';

import {
  ICommandPalette
} from '../commandpalette';

import {
  dateTime
} from '../common/dates';

import {
  showDialog, cancelButton, warnButton
} from '../common/dialog';

import {
  InstanceTracker
} from '../common/instancetracker';

import {
  selectKernel
} from '../docregistry';

import {
  IPathTracker
} from '../filebrowser';

import {
  IInstanceRestorer
} from '../instancerestorer';

import {
  IMainMenu
} from '../mainmenu';

import {
  IRenderMime, RenderMime
} from '../rendermime';

import {
  IServiceManager
} from '../services';

import {
  IConsoleTracker, ICreateConsoleArgs, ConsolePanel, CommandIDs
} from './index';


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
    IInstanceRestorer
  ],
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
    let editorFactory = editorServices.factoryService.newInlineEditor;
    return new ConsolePanel.ContentFactory({ editorFactory });
  }
};


/**
 * Export the plugins as the default.
 */
const plugins: JupyterLabPlugin<any>[] = [contentFactoryPlugin, trackerPlugin];
export default plugins;


/**
 * The class name for all main area landscape tab icons.
 */
const LANDSCAPE_ICON_CLASS = 'jp-MainAreaLandscapeIcon';

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
function activateConsole(app: JupyterLab, services: IServiceManager, rendermime: IRenderMime, mainMenu: IMainMenu, palette: ICommandPalette, pathTracker: IPathTracker, contentFactory: ConsolePanel.IContentFactory,  editorServices: IEditorServices, restorer: IInstanceRestorer): IConsoleTracker {
  let manager = services.sessions;
  let { commands, keymap } = app;
  let category = 'Console';
  let command: string;
  let count = 0;
  let menu = new Menu({ commands, keymap });

  // Create an instance tracker for all console panels.
  const tracker = new InstanceTracker<ConsolePanel>({ namespace: 'console' });

  // Handle state restoration.
  restorer.restore(tracker, {
    command: CommandIDs.create,
    args: panel => ({ id: panel.console.session.id }),
    name: panel => panel.console.session && panel.console.session.id,
    when: manager.ready
  });

  // Set the main menu title.
  menu.title.label = category;

  command = CommandIDs.create;
  commands.addCommand(command, {
    label: 'Start New Console',
    execute: (args?: ICreateConsoleArgs) => {
      let name = `Console ${++count}`;

      args = args || {};

      // If we get a session, use it.
      if (args.id) {
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
      if (ContentsManager.extname(path)) {
        path = ContentsManager.dirname(path);
      }
      path = `${path}/console-${count}-${utils.uuid()}`;

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

  command = CommandIDs.clear;
  commands.addCommand(command, {
    label: 'Clear Cells',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        current.console.clear();
      }
    }
  });
  palette.addItem({ command, category });

  command = CommandIDs.run;
  commands.addCommand(command, {
    label: 'Run Cell',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        current.console.execute();
      }
    }
  });
  palette.addItem({ command, category });

  command = CommandIDs.runForced;
  commands.addCommand(command, {
    label: 'Run Cell (forced)',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        current.console.execute(true);
      }
    }
  });
  palette.addItem({ command, category });

  command = CommandIDs.linebreak;
  commands.addCommand(command, {
    label: 'Insert Line Break',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        current.console.insertLinebreak();
      }
    }
  });
  palette.addItem({ command, category });

  command = CommandIDs.interrupt;
  commands.addCommand(command, {
    label: 'Interrupt Kernel',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        let kernel = current.console.session.kernel;
        if (kernel) {
          return kernel.interrupt();
        }
      }
    }
  });
  palette.addItem({ command, category });

  command = CommandIDs.restart;
  commands.addCommand(command, {
    label: 'Restart Kernel',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        let kernel = current.console.session.kernel;
        if (kernel) {
          return kernel.restart();
        }
      }
    }
  });
  palette.addItem({ command, category });

  command = CommandIDs.closeAndShutdown;
  commands.addCommand(command, {
    label: 'Close and Shutdown',
    execute: () => {
      let current = tracker.currentWidget;
      if (!current) {
        return;
      }
      app.shell.activateMain(current.id);
      showDialog({
        title: 'Shutdown the console?',
        body: `Are you sure you want to close "${current.title.label}"?`,
        buttons: [cancelButton, warnButton]
      }).then(result => {
        if (result.text === 'OK') {
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
      let id = args['id'];
      tracker.find(widget => {
        if (widget.console.session.id === id) {
          widget.console.inject(args['code'] as string);
          return true;
        }
      });
    }
  });

  command = CommandIDs.open;
  commands.addCommand(command, {
    execute: (args: JSONObject) => {
      let id = args['id'];
      let widget = tracker.find(value => {
        if (value.console.session.id === id) {
          return true;
        }
      });
      if (widget) {
        app.shell.activateMain(widget.id);
      } else {
        app.commands.execute(CommandIDs.create, { id });
      }
    }
  });

  /**
   * Get the kernel given the create args.
   */
  function getKernel(args: ICreateConsoleArgs, name: string): Promise<Kernel.IModel> {
    if (args.kernel) {
      return Promise.resolve(args.kernel);
    }
    return manager.ready.then(() => {
      let options = {
        name,
        specs: manager.specs,
        sessions: manager.running(),
        preferredLanguage: args.preferredLanguage || '',
        host: document.body
      };
      return selectKernel(options);
    });
  }

  let id = 0; // The ID counter for notebook panels.

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
    let resolver = new RenderMime.UrlResolver({
      session,
      contents: services.contents
    });
    panel.console.rendermime.resolver = resolver;

    let specs = manager.specs;
    let displayName = specs.kernelspecs[session.kernel.name].display_name;
    let captionOptions: Private.ICaptionOptions = {
      label: name,
      displayName,
      path: session.path,
      connected: new Date()
    };
    // If the console panel does not have an ID, assign it one.
    panel.id = panel.id || `console-${++id}`;
    panel.title.label = name;
    panel.title.caption = Private.caption(captionOptions);
    panel.title.icon = `${LANDSCAPE_ICON_CLASS} ${CONSOLE_ICON_CLASS}`;
    panel.title.closable = true;
    // Update the caption of the tab with the last execution time.
    panel.console.executed.connect((sender, executed) => {
      captionOptions.executed = executed;
      panel.title.caption = Private.caption(captionOptions);
    });
    // Update the caption of the tab when the kernel changes.
    panel.console.session.kernelChanged.connect(() => {
      let newName = panel.console.session.kernel.name;
      name = specs.kernelspecs[name].display_name;
      captionOptions.displayName = newName;
      captionOptions.connected = new Date();
      captionOptions.executed = null;
      panel.title.caption = Private.caption(captionOptions);
    });
    // Add the console panel to the tracker.
    tracker.add(panel);
    app.shell.addToMainArea(panel);
    app.shell.activateMain(panel.id);
  }

  command = CommandIDs.switchKernel;
  commands.addCommand(command, {
    label: 'Switch Kernel',
    execute: () => {
      let current = tracker.currentWidget;
      if (!current) {
        return;
      }
      let widget = current.console;
      let session = widget.session;
      let lang = '';
      manager.ready.then(() => {
        let specs = manager.specs;
        if (session.kernel) {
          lang = specs.kernelspecs[session.kernel.name].language;
        }
        let options = {
          name: widget.parent.title.label,
          specs,
          sessions: manager.running(),
          preferredLanguage: lang,
          kernel: session.kernel.model,
          host: widget.parent.node
        };
        return selectKernel(options);
      }).then((kernelId: Kernel.IModel) => {
        // If the user cancels, kernelId will be void and should be ignored.
        if (kernelId) {
          return session.changeKernel(kernelId);
        }
      });
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


/**
 * A namespace for private data.
 */
namespace Private {
  /**
   * An interface for caption options.
   */
  export
  interface ICaptionOptions {
    /**
     * The time when the console connected to the current kernel.
     */
    connected: Date;

    /**
     * The time when the console last executed its prompt.
     */
    executed?: Date;

    /**
     * The path to the file backing the console.
     *
     * #### Notes
     * Currently, the actual file does not exist, but the directory is the
     * current working directory at the time the console was opened.
     */
    path: string;

    /**
     * The label of the console (as displayed in tabs).
     */
    label: string;

    /**
     * The display name of the console's kernel.
     */
    displayName: string;
  }

  /**
   * Generate a caption for a console's title.
   */
  export
  function caption(options: ICaptionOptions): string {
    let { label, path, displayName, connected, executed } = options;
    let caption = (
      `Name: ${label}\n` +
      `Directory: ${ContentsManager.dirname(path)}\n` +
      `Kernel: ${displayName}\n` +
      `Connected: ${dateTime(connected.toISOString())}`
    );
    if (executed) {
      caption += `\nLast Execution: ${dateTime(executed.toISOString())}`;
    }
    return caption;
  }
}
