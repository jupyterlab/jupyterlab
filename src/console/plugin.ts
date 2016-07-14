// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  IKernel, ISession, ServiceManager
} from 'jupyter-js-services';

import {
  ConsolePanel
} from './widget';

import {
  RenderMime
} from '../rendermime';

import {
  selectKernel
} from '../docregistry';

import {
  WidgetTracker
} from '../widgettracker';

import {
  Application
} from 'phosphide/lib/core/application';

import {
  TabPanel
} from 'phosphor-tabs';

import {
  Widget
} from 'phosphor-widget';

import {
  MainMenu, mainMenuProvider
} from '../mainmenu/plugin';

import {
  MenuItem, Menu, IMenuItemOptions, MenuItemType
} from 'phosphor-menus';

/**
 * The console extension.
 */
export
const consoleExtension = {
  id: 'jupyter.extensions.console',
  requires: [ServiceManager, RenderMime, MainMenu],
  activate: activateConsole
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
 * Activate the console extension.
 */
function activateConsole(app: Application, services: ServiceManager, rendermime: RenderMime<Widget>, mainMenu: MainMenu): Promise<void> {
  let tracker = new WidgetTracker<ConsolePanel>();
  let manager = services.sessions;

  let newSubmenuItems : Array<MenuItem> = [];

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
  for (let displayName of displayNames) {
    let id = `console:create-${displayNameMap[displayName]}`;
    app.commands.add([{
      id,
      handler: () => {
        manager.startNew({
          path: `Console-${count++}`,
          kernelName: `${displayNameMap[displayName]}`
        }).then(session => {
          let panel = new ConsolePanel({
            session, rendermime: rendermime.clone()
          });
          panel.id = `console-${count}`;
          panel.title.text = `${displayName} (${count})`;
          panel.title.icon = `${LANDSCAPE_ICON_CLASS} ${CONSOLE_ICON_CLASS}`;
          panel.title.closable = true;
          app.shell.addToMainArea(panel);
          tracker.addWidget(panel);
        });
      }
    }]);
    app.palette.add([{
      command: id,
      category: 'Console',
      text: `New ${displayName} console`
    }]);

    newSubmenuItems.push(
      new MenuItem ({
        text: `${displayName} console`,
        handler: () => {
          app.commands.execute(id);
        }
      })
    );
  }

  app.commands.add([
  {
    id: 'console:clear',
    handler: () => {
      if (tracker.activeWidget) {
        tracker.activeWidget.content.clear();
      }
    }
  },
  {
    id: 'console:dismiss-overlays',
    handler: () => {
      if (tracker.activeWidget) {
        tracker.activeWidget.content.dismissOverlays();
      }
    }
  },
  {
    id: 'console:execute',
    handler: () => {
      if (tracker.activeWidget) {
        tracker.activeWidget.content.execute();
      }
    }
  },
  {
    id: 'console:interrupt-kernel',
    handler: () => {
      if (tracker.activeWidget) {
        let kernel = tracker.activeWidget.content.session.kernel;
        if (kernel) {
          kernel.interrupt();
        }
      }
    }
  },
  {
    id: 'console:switch-kernel',
    handler: () => {
      if (tracker.activeWidget) {
        let widget = tracker.activeWidget.content;
        let session = widget.session;
        let lang = '';
        if (session.kernel) {
          lang = specs.kernelspecs[session.kernel.name].spec.language;
        }
        manager.listRunning().then((sessions: ISession.IModel[]) => {
          let options = {
            name: widget.parent.title.text,
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
    }
  }

  ]);
  app.palette.add([
  {
    command: 'console:clear',
    category: 'Console',
    text: 'Clear Cells'
  },
  {
    command: 'console:execute',
    category: 'Console',
    text: 'Execute Cell'
  },
  {
    command: 'console:interrupt-kernel',
    category: 'Console',
    text: 'Interrupt Kernel'
  },
  {
    command: 'console:switch-kernel',
    category: 'Console',
    text: 'Switch Kernel'
  }]);

 let newSubmenu = new Menu(newSubmenuItems);

  let menu = new Menu ([
    new MenuItem ({
      text: 'New',
      submenu: newSubmenu
    }),
    new MenuItem ({
      text: 'Clear Cells',
      handler: () => {
        app.commands.execute('console:clear');
      }
    }),
    new MenuItem ({
      text: 'Execute Cell',
      handler: () => {
        app.commands.execute('console:execute');
      }
    }),
    new MenuItem ({
      text: 'Interrupt Kernel',
      handler: () => {
        app.commands.execute('console:interrupt-kernel');
      }
    }),
    new MenuItem ({
      text: 'Switch Kernel',
      handler: () => {
        app.commands.execute('console:switch-kernel');
      }
    })
  ]);

  let consoleMenu = new MenuItem ({
    text: 'Console',
    submenu: menu
  });

  mainMenu.addItem(consoleMenu, {rank: 50});

  return Promise.resolve(void 0);
}
