// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ContentsManager, Kernel, ISession, Session, utils
} from 'jupyter-js-services';

import {
  JSONObject
} from 'phosphor/lib/algorithm/json';

import {
  FocusTracker
} from 'phosphor/lib/ui/focustracker';

import {
  Widget
} from 'phosphor/lib/ui/widget';

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
  selectKernel
} from '../docregistry';

import {
  IPathTracker
} from '../filebrowser';

import {
  IInspector
} from '../inspector';

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
  IConsoleTracker, ConsolePanel, ConsoleContent
} from './index';


/**
 * The console widget tracker provider.
 */
export
const consoleTrackerProvider: JupyterLabPlugin<IConsoleTracker> = {
  id: 'jupyter.services.console-tracker',
  provides: IConsoleTracker,
  requires: [
    IServiceManager,
    IRenderMime,
    IMainMenu,
    IInspector,
    ICommandPalette,
    IPathTracker,
    ConsoleContent.IRenderer
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
const CONSOLE_ICON_CLASS = 'jp-ImageConsole';


/**
 * The interface for a start console.
 */
interface ICreateConsoleArgs extends JSONObject {
  sessionId?: string;
  path?: string;
  kernel?: Kernel.IModel;
  preferredLanguage?: string;
}


/**
 * Activate the console extension.
 */
function activateConsole(app: JupyterLab, services: IServiceManager, rendermime: IRenderMime, mainMenu: IMainMenu, inspector: IInspector, palette: ICommandPalette, pathTracker: IPathTracker, renderer: ConsoleContent.IRenderer): IConsoleTracker {
  let tracker = new FocusTracker<ConsolePanel>();
  let manager = services.sessions;
  let specs = services.kernelspecs;

  let { commands, keymap } = app;
  let category = 'Console';

  let menu = new Menu({ commands, keymap });
  menu.title.label = 'Console';

  let command: string;

  // Set the source of the code inspector to the current console.
  app.shell.currentChanged.connect((shell, args) => {
    let widget = args.newValue as ConsolePanel;
    if (tracker.has(widget)) {
      inspector.source = widget.content.inspectionHandler;
    }
  });

  // Set the main menu title.
  menu.title.label = 'Console';

  command = 'console:create-new';
  commands.addCommand(command, {
    label: 'Start New Console',
    execute: () => {
      commands.execute('console:create', { });
    }
  });
  palette.addItem({ command, category });
  menu.addItem({ command });

  command = 'console:clear';
  commands.addCommand(command, {
    label: 'Clear Cells',
    execute: () => {
      if (tracker.currentWidget) {
        tracker.currentWidget.content.clear();
      }
    }
  });
  palette.addItem({ command, category });
  menu.addItem({ command });

  command = 'console:dismiss-completer';
  commands.addCommand(command, {
    execute: () => {
      if (tracker.currentWidget) {
        tracker.currentWidget.content.dismissCompleter();
      }
    }
  });

  command = 'console:run';
  commands.addCommand(command, {
    label: 'Run Cell',
    execute: () => {
      if (tracker.currentWidget) {
        tracker.currentWidget.content.execute();
      }
    }
  });
  palette.addItem({ command, category });
  menu.addItem({ command });


  command = 'console:run-forced';
  commands.addCommand(command, {
    label: 'Run Cell (forced)',
    execute: () => {
      if (tracker.currentWidget) {
        tracker.currentWidget.content.execute(true);
      }
    }
  });
  palette.addItem({ command, category });
  menu.addItem({ command });

  command = 'console:linebreak';
  commands.addCommand(command, {
    label: 'Insert Line Break',
    execute: () => {
      if (tracker.currentWidget) {
        tracker.currentWidget.content.insertLinebreak();
      }
    }
  });
  palette.addItem({ command, category });
  menu.addItem({ command });

  command = 'console:interrupt-kernel';
  commands.addCommand(command, {
    label: 'Interrupt Kernel',
    execute: () => {
      if (tracker.currentWidget) {
        let kernel = tracker.currentWidget.content.session.kernel;
        if (kernel) {
          kernel.interrupt();
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
      if (args.sessionId) {
        return manager.connectTo(args.sessionId).then(session => {
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
      path = `${path}/console-${utils.uuid()}`;

      // Get the kernel model.
      return getKernel(args, name).then(kernel => {
        if (!kernel) {
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
      for (let i = 0; i < tracker.widgets.length; i++) {
        let widget = tracker.widgets.at(i);
        if (widget.content.session.id === id) {
          widget.content.inject(args['code'] as string);
        }
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
    return manager.listRunning().then((sessions: Session.IModel[]) => {
      let options = {
        name,
        specs,
        sessions,
        preferredLanguage: args.preferredLanguage || '',
        host: document.body
      };
      return selectKernel(options);
    });
  }

  let displayNameMap: { [key: string]: string } = Object.create(null);
  for (let kernelName in specs.kernelspecs) {
    let displayName = specs.kernelspecs[kernelName].spec.display_name;
    displayNameMap[kernelName] = displayName;
  }

  /**
   * Create a console for a given session.
   */
  function createConsole(session: ISession, name: string): void {
    let panel = new ConsolePanel({
      session,
      rendermime: rendermime.clone(),
      renderer: renderer
    });
    let displayName = displayNameMap[session.kernel.name];
    let captionOptions: Private.ICaptionOptions = {
      label: name,
      displayName,
      path: session.path,
      connected: new Date()
    };
    panel.id = `console-${session.id}`;
    panel.title.label = name;
    panel.title.caption = Private.caption(captionOptions);
    panel.title.icon = `${LANDSCAPE_ICON_CLASS} ${CONSOLE_ICON_CLASS}`;
    panel.title.closable = true;
    app.shell.addToMainArea(panel);
    // Update the caption of the tab with the last execution time.
    panel.content.executed.connect((sender, executed) => {
      captionOptions.executed = executed;
      panel.title.caption = Private.caption(captionOptions);
    });
    // Update the caption of the tab when the kernel changes.
    panel.content.session.kernelChanged.connect(() => {
      let name = panel.content.session.kernel.name;
      name = specs.kernelspecs[name].spec.display_name;
      captionOptions.displayName = name;
      captionOptions.connected = new Date();
      captionOptions.executed = null;
      panel.title.caption = Private.caption(captionOptions);
    });
    // Immediately set the inspector source to the current console.
    inspector.source = panel.content.inspectionHandler;
    // Add the console to the focus tracker.
    tracker.add(panel);
  }

  command = 'console:switch-kernel';
  commands.addCommand(command, {
    label: 'Switch Kernel',
    execute: () => {
      if (!tracker.currentWidget) {
        return;
      }
      let widget = tracker.currentWidget.content;
      let session = widget.session;
      let lang = '';
      if (session.kernel) {
        lang = specs.kernelspecs[session.kernel.name].spec.language;
      }
      manager.listRunning().then((sessions: Session.IModel[]) => {
        let options = {
          name: widget.parent.title.label,
          specs,
          sessions,
          preferredLanguage: lang,
          kernel: session.kernel.model,
          host: widget.parent.node
        };
        return selectKernel(options);
      }).then((kernelId: Kernel.IModel) => {
        // If the user cancels, kernelId will be void and should be ignored.
        if (kernelId) {
          session.changeKernel(kernelId);
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




