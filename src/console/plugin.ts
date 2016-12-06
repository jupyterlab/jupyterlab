// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ContentsManager, Kernel, Session, utils
} from '@jupyterlab/services';

import {
  JSONObject
} from 'phosphor/lib/algorithm/json';

import {
  Menu
} from 'phosphor/lib/ui/menu';

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  ICommandPalette
} from '../commandpalette';

import {
  dateTime
} from '../common/dates';

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
  IInspector
} from '../inspector';

import {
  ILayoutRestorer
} from '../layoutrestorer';

import {
  IMainMenu
} from '../mainmenu';

import {
  IRenderMime
} from '../rendermime';

import {
  IServiceManager
} from '../services';

import {
  IStateDB
} from '../statedb';

import {
  IConsoleTracker, ConsolePanel, ConsoleContent
} from './index';


/**
 * The console widget tracker provider.
 */
export
const plugin: JupyterLabPlugin<IConsoleTracker> = {
  id: 'jupyter.services.console-tracker',
  provides: IConsoleTracker,
  requires: [
    IServiceManager,
    IRenderMime,
    IMainMenu,
    IInspector,
    ICommandPalette,
    IPathTracker,
    ConsoleContent.IRenderer,
    IStateDB,
    ILayoutRestorer
  ],
  activate: activateConsole,
  autoStart: true
};


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
 * The arguments used to create a console.
 */
interface ICreateConsoleArgs extends JSONObject {
  id?: string;
  path?: string;
  kernel?: Kernel.IModel;
  preferredLanguage?: string;
}


/**
 * Activate the console extension.
 */
function activateConsole(app: JupyterLab, services: IServiceManager, rendermime: IRenderMime, mainMenu: IMainMenu, inspector: IInspector, palette: ICommandPalette, pathTracker: IPathTracker, renderer: ConsoleContent.IRenderer, state: IStateDB, layout: ILayoutRestorer): IConsoleTracker {
  let manager = services.sessions;

  let { commands, keymap } = app;
  let category = 'Console';
  let command: string;
  let menu = new Menu({ commands, keymap });

  // Create an instance tracker for all console panels.
  const tracker = new InstanceTracker<ConsolePanel>({
    restore: {
      state, layout,
      command: 'console:create',
      args: panel => ({ id: panel.content.session.id }),
      name: panel => panel.content.session && panel.content.session.id,
      namespace: 'console',
      when: [app.started, manager.ready],
      registry: app.commands
    }
  });

  // Sync tracker and set the source of the code inspector.
  app.shell.currentChanged.connect((sender, args) => {
    let widget = tracker.sync(args.newValue);
    if (widget) {
      inspector.source = widget.content.inspectionHandler;
    }
  });

  // Set the main menu title.
  menu.title.label = category;

  command = 'console:create-new';
  commands.addCommand(command, {
    label: 'Start New Console',
    execute: () => commands.execute('console:create', { })
  });
  palette.addItem({ command, category });
  menu.addItem({ command });

  command = 'console:clear';
  commands.addCommand(command, {
    label: 'Clear Cells',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        current.content.clear();
      }
    }
  });
  palette.addItem({ command, category });
  menu.addItem({ command });

  command = 'console:run';
  commands.addCommand(command, {
    label: 'Run Cell',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        current.content.execute();
      }
    }
  });
  palette.addItem({ command, category });
  menu.addItem({ command });


  command = 'console:run-forced';
  commands.addCommand(command, {
    label: 'Run Cell (forced)',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        current.content.execute(true);
      }
    }
  });
  palette.addItem({ command, category });
  menu.addItem({ command });

  command = 'console:linebreak';
  commands.addCommand(command, {
    label: 'Insert Line Break',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        current.content.insertLinebreak();
      }
    }
  });
  palette.addItem({ command, category });
  menu.addItem({ command });

  command = 'console:interrupt-kernel';
  commands.addCommand(command, {
    label: 'Interrupt Kernel',
    execute: () => {
      let current = tracker.currentWidget;
      if (current) {
        let kernel = current.content.session.kernel;
        if (kernel) {
          return kernel.interrupt();
        }
      }
    }
  });
  palette.addItem({ command, category });
  menu.addItem({ command });

  let count = 0;

  command = 'console:create';
  commands.addCommand(command, {
    execute: (args: ICreateConsoleArgs) => {
      args = args || {};

      let name = `Console ${++count}`;

      // If we get a session, use it.
      if (args.id) {
        return manager.ready.then(() => {
          return manager.connectTo(args.id);
        }).then(session => {
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

  command = 'console:inject';
  commands.addCommand(command, {
    execute: (args: JSONObject) => {
      let id = args['id'];
      tracker.find(widget => {
        if (widget.content.session.id === id) {
          widget.content.inject(args['code'] as string);
          return true;
        }
      });
    }
  });

  command = 'console:open';
  commands.addCommand(command, {
    execute: (args: JSONObject) => {
      let id = args['id'];
      let widget = tracker.find(value => {
        if (value.content.session.id === id) {
          return true;
        }
      });
      if (widget) {
        app.shell.activateMain(widget.id);
      } else {
        app.commands.execute('console:create', { id });
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
    let panel = new ConsolePanel({
      session, rendermime: rendermime.clone(), renderer
    });
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
    panel.content.executed.connect((sender, executed) => {
      captionOptions.executed = executed;
      panel.title.caption = Private.caption(captionOptions);
    });
    // Update the caption of the tab when the kernel changes.
    panel.content.session.kernelChanged.connect(() => {
      let newName = panel.content.session.kernel.name;
      name = specs.kernelspecs[name].display_name;
      captionOptions.displayName = newName;
      captionOptions.connected = new Date();
      captionOptions.executed = null;
      panel.title.caption = Private.caption(captionOptions);
    });
    // Immediately set the inspector source to the current console.
    inspector.source = panel.content.inspectionHandler;
    // Add the console panel to the tracker.
    tracker.add(panel);
    app.shell.addToMainArea(panel);
    app.shell.activateMain(panel.id);
  }

  command = 'console:switch-kernel';
  commands.addCommand(command, {
    label: 'Switch Kernel',
    execute: () => {
      let current = tracker.currentWidget;
      if (!current) {
        return;
      }
      let widget = current.content;
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
  menu.addItem({ command });

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
