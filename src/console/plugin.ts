// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  ContentsManager, IKernel, ISession
} from 'jupyter-js-services';

import {
  FocusTracker
} from 'phosphor/lib/ui/focustracker';

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
  ConsolePanel, ConsoleWidget
} from './';


/**
 * The console extension.
 */
export
const consoleExtension: JupyterLabPlugin<void> = {
  id: 'jupyter.extensions.console',
  requires: [
    IServiceManager,
    IRenderMime,
    IMainMenu,
    IInspector,
    ICommandPalette,
    IPathTracker,
    ConsoleWidget.IRenderer
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
 * The file extension for consoles.
 */
const FILE_EXTENSION = 'jpcon';


/**
 * Activate the console extension.
 */
function activateConsole(app: JupyterLab, services: IServiceManager, rendermime: IRenderMime, mainMenu: IMainMenu, inspector: IInspector, palette: ICommandPalette, pathTracker: IPathTracker, renderer: ConsoleWidget.IRenderer): void {
  let tracker = new FocusTracker<ConsolePanel>();
  let manager = services.sessions;
  let { commands, keymap } = app;
  let category = 'Console';

  let menu = new Menu({ commands, keymap });
  menu.title.label = 'Console';

  let submenu: Menu = null;
  let command: string;

  // Set the main menu title.
  menu.title.label = 'Console';

  // Add the ability to create new consoles for each kernel.
  let specs = services.kernelspecs;
  let displayNameMap: { [key: string]: string } = Object.create(null);
  for (let kernelName in specs.kernelspecs) {
    let displayName = specs.kernelspecs[kernelName].spec.display_name;
    displayNameMap[displayName] = kernelName;
  }
  let displayNames = Object.keys(displayNameMap).sort((a, b) => {
    return a.localeCompare(b);
  });
  let count = 0;

  // If there are available kernels, populate the "New" menu item.
  if (displayNames.length) {
    submenu = new Menu({ commands, keymap });
    submenu.title.label = 'New';
    menu.addItem({ type: 'submenu', menu: submenu });
  }

  for (let displayName of displayNames) {
    command = `console:create-${displayNameMap[displayName]}`;
    commands.addCommand(command, {
      label: `${displayName} console`,
      execute: () => {
        count++;
        let file = `console-${count}`;
        let path = `${pathTracker.path}/${file}.${FILE_EXTENSION}`;
        let label = `Console ${count}`;
        let kernelName = `${displayNameMap[displayName]}`;
        let captionOptions: Private.ICaptionOptions = {
          label, displayName, path,
          opened: new Date()
        };
        manager.startNew({ path, kernelName }).then(session => {
          let panel = new ConsolePanel({
            session,
            rendermime: rendermime.clone(),
            renderer: renderer
          });
          panel.id = file;
          panel.title.label = label;
          panel.title.caption = Private.caption(captionOptions);
          panel.title.icon = `${LANDSCAPE_ICON_CLASS} ${CONSOLE_ICON_CLASS}`;
          panel.title.closable = true;
          app.shell.addToMainArea(panel);
          tracker.add(panel);
          // Update the caption of the tab with the last execution time.
          panel.content.executed.connect((sender, executed) => {
            captionOptions.executed = executed;
            panel.title.caption = Private.caption(captionOptions);
          });
          // Set the source of the code inspector to the current console.
          panel.activated.connect(() => {
            inspector.source = panel.content.inspectionHandler;
          });
        });
      }
    });
    palette.addItem({ command, category });
    submenu.addItem({ command });
  }

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


  command = 'console:dismiss-completion';
  commands.addCommand(command, {
    execute: () => {
      if (tracker.currentWidget) {
        tracker.currentWidget.content.dismissCompletion();
      }
    }
  });


  command = 'console:execute';
  commands.addCommand(command, {
    label: 'Execute Cell',
    execute: () => {
      if (tracker.currentWidget) {
        tracker.currentWidget.content.execute();
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
      manager.listRunning().then((sessions: ISession.IModel[]) => {
        let options = {
          name: widget.parent.title.label,
          specs,
          sessions,
          preferredLanguage: lang,
          kernel: session.kernel.model,
          host: widget.parent.node
        };
        return selectKernel(options);
      }).then((kernelId: IKernel.IModel) => {
        if (kernelId) {
          session.changeKernel(kernelId);
        } else {
          session.kernel.shutdown();
        }
      });
    }
  });
  palette.addItem({ command, category });
  menu.addItem({ command });

  mainMenu.addMenu(menu, {rank: 50});
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
     * The time when the console was opened.
     */
    opened: Date;

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
    let { label, path, displayName, opened, executed } = options;
    let caption = (
      `Name: ${label}\n` +
      `Directory: ${ContentsManager.dirname(path)}\n` +
      `Kernel: ${displayName}\n` +
      `Opened: ${dateTime(opened.toISOString())}`
    );
    if (executed) {
      caption += `\nLast Execution: ${dateTime(executed.toISOString())}`;
    }
    return caption;
  }
}
