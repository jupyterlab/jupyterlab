// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module mainmenu-extension
 */

import {
  createSemanticCommand,
  ILabShell,
  IRouter,
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import {
  Dialog,
  ICommandPalette,
  MenuFactory,
  showDialog
} from '@jupyterlab/apputils';
import { PageConfig, URLExt } from '@jupyterlab/coreutils';
import {
  IEditMenu,
  IFileMenu,
  IHelpMenu,
  IKernelMenu,
  IMainMenu,
  IRunMenu,
  ITabsMenu,
  IViewMenu,
  JupyterLabMenu,
  MainMenu
} from '@jupyterlab/mainmenu';
import { ServerConnection } from '@jupyterlab/services';
import { ISettingRegistry, SettingRegistry } from '@jupyterlab/settingregistry';
import { ITranslator, TranslationBundle } from '@jupyterlab/translation';
import { refreshIcon, runIcon, stopIcon } from '@jupyterlab/ui-components';
import { find } from '@lumino/algorithm';
import { JSONExt } from '@lumino/coreutils';
import { IDisposable } from '@lumino/disposable';
import { Menu, Widget } from '@lumino/widgets';

const PLUGIN_ID = '@jupyterlab/mainmenu-extension:plugin';

/**
 * A namespace for command IDs of semantic extension points.
 */
export namespace CommandIDs {
  export const openEdit = 'editmenu:open';

  export const undo = 'editmenu:undo';

  export const redo = 'editmenu:redo';

  export const clearCurrent = 'editmenu:clear-current';

  export const clearAll = 'editmenu:clear-all';

  export const find = 'editmenu:find';

  export const goToLine = 'editmenu:go-to-line';

  export const openFile = 'filemenu:open';

  export const closeAndCleanup = 'filemenu:close-and-cleanup';

  export const createConsole = 'filemenu:create-console';

  export const shutdown = 'filemenu:shutdown';

  export const logout = 'filemenu:logout';

  export const openKernel = 'kernelmenu:open';

  export const interruptKernel = 'kernelmenu:interrupt';

  export const reconnectToKernel = 'kernelmenu:reconnect-to-kernel';

  export const restartKernel = 'kernelmenu:restart';

  export const restartKernelAndClear = 'kernelmenu:restart-and-clear';

  export const changeKernel = 'kernelmenu:change';

  export const shutdownKernel = 'kernelmenu:shutdown';

  export const shutdownAllKernels = 'kernelmenu:shutdownAll';

  export const openView = 'viewmenu:open';

  export const wordWrap = 'viewmenu:word-wrap';

  export const lineNumbering = 'viewmenu:line-numbering';

  export const matchBrackets = 'viewmenu:match-brackets';

  export const openRun = 'runmenu:open';

  export const run = 'runmenu:run';

  export const runAll = 'runmenu:run-all';

  export const restartAndRunAll = 'runmenu:restart-and-run-all';

  export const runAbove = 'runmenu:run-above';

  export const runBelow = 'runmenu:run-below';

  export const openTabs = 'tabsmenu:open';

  export const activateById = 'tabsmenu:activate-by-id';

  export const activatePreviouslyUsedTab =
    'tabsmenu:activate-previously-used-tab';

  export const openSettings = 'settingsmenu:open';

  export const openHelp = 'helpmenu:open';

  export const getKernel = 'helpmenu:get-kernel';

  export const openFirst = 'mainmenu:open-first';
}

/**
 * A service providing an interface to the main menu.
 */
const plugin: JupyterFrontEndPlugin<IMainMenu> = {
  id: PLUGIN_ID,
  requires: [IRouter, ITranslator],
  optional: [ICommandPalette, ILabShell, ISettingRegistry],
  provides: IMainMenu,
  activate: async (
    app: JupyterFrontEnd,
    router: IRouter,
    translator: ITranslator,
    palette: ICommandPalette | null,
    labShell: ILabShell | null,
    registry: ISettingRegistry | null
  ): Promise<IMainMenu> => {
    const { commands } = app;
    const trans = translator.load('jupyterlab');

    const menu = new MainMenu(commands);
    menu.id = 'jp-MainMenu';
    menu.addClass('jp-scrollbar-tiny');

    // Built menu from settings
    if (registry) {
      await Private.loadSettingsMenu(
        registry,
        (aMenu: JupyterLabMenu) => {
          menu.addMenu(aMenu, { rank: aMenu.rank });
        },
        options => MainMenu.generateMenu(commands, options, trans),
        translator
      );
    }

    // Only add quit button if the back-end supports it by checking page config.
    const quitButton = PageConfig.getOption('quitButton').toLowerCase();
    menu.fileMenu.quitEntry = quitButton === 'true';

    // Create the application menus.
    createEditMenu(app, menu.editMenu, trans);
    createFileMenu(app, menu.fileMenu, router, trans);
    createKernelMenu(app, menu.kernelMenu, trans);
    createRunMenu(app, menu.runMenu, trans);
    createViewMenu(app, menu.viewMenu, trans);
    createHelpMenu(app, menu.helpMenu, trans);

    // The tabs menu relies on lab shell functionality.
    if (labShell) {
      createTabsMenu(app, menu.tabsMenu, labShell, trans);
    }

    // Create commands to open the main application menus.
    const activateMenu = (item: Menu) => {
      menu.activeMenu = item;
      menu.openActiveMenu();
    };

    commands.addCommand(CommandIDs.openEdit, {
      label: trans.__('Open Edit Menu'),
      execute: () => activateMenu(menu.editMenu)
    });
    commands.addCommand(CommandIDs.openFile, {
      label: trans.__('Open File Menu'),
      execute: () => activateMenu(menu.fileMenu)
    });
    commands.addCommand(CommandIDs.openKernel, {
      label: trans.__('Open Kernel Menu'),
      execute: () => activateMenu(menu.kernelMenu)
    });
    commands.addCommand(CommandIDs.openRun, {
      label: trans.__('Open Run Menu'),
      execute: () => activateMenu(menu.runMenu)
    });
    commands.addCommand(CommandIDs.openView, {
      label: trans.__('Open View Menu'),
      execute: () => activateMenu(menu.viewMenu)
    });
    commands.addCommand(CommandIDs.openSettings, {
      label: trans.__('Open Settings Menu'),
      execute: () => activateMenu(menu.settingsMenu)
    });
    commands.addCommand(CommandIDs.openTabs, {
      label: trans.__('Open Tabs Menu'),
      execute: () => activateMenu(menu.tabsMenu)
    });
    commands.addCommand(CommandIDs.openHelp, {
      label: trans.__('Open Help Menu'),
      execute: () => activateMenu(menu.helpMenu)
    });
    commands.addCommand(CommandIDs.openFirst, {
      label: trans.__('Open First Menu'),
      execute: () => {
        menu.activeIndex = 0;
        menu.openActiveMenu();
      }
    });

    if (palette) {
      // Add some of the commands defined here to the command palette.
      palette.addItem({
        command: CommandIDs.shutdown,
        category: trans.__('Main Area')
      });
      palette.addItem({
        command: CommandIDs.logout,
        category: trans.__('Main Area')
      });

      palette.addItem({
        command: CommandIDs.shutdownAllKernels,
        category: trans.__('Kernel Operations')
      });

      palette.addItem({
        command: CommandIDs.activatePreviouslyUsedTab,
        category: trans.__('Main Area')
      });
    }

    app.shell.add(menu, 'menu', { rank: 100 });

    return menu;
  }
};

/**
 * Create the basic `Edit` menu.
 */
export function createEditMenu(
  app: JupyterFrontEnd,
  menu: IEditMenu,
  trans: TranslationBundle
): void {
  const commands = app.commands;

  // Add the undo/redo commands the the Edit menu.
  commands.addCommand(
    CommandIDs.undo,
    createSemanticCommand(
      app,
      menu.undoers.undo,
      {
        label: trans.__('Undo')
      },
      trans
    )
  );
  commands.addCommand(
    CommandIDs.redo,
    createSemanticCommand(
      app,
      menu.undoers.redo,
      {
        label: trans.__('Redo')
      },
      trans
    )
  );

  // Add the clear commands to the Edit menu.
  commands.addCommand(
    CommandIDs.clearCurrent,
    createSemanticCommand(
      app,
      menu.clearers.clearCurrent,
      {
        label: trans.__('Clear')
      },
      trans
    )
  );
  commands.addCommand(
    CommandIDs.clearAll,
    createSemanticCommand(
      app,
      menu.clearers.clearAll,
      {
        label: trans.__('Clear All')
      },
      trans
    )
  );

  commands.addCommand(
    CommandIDs.goToLine,
    createSemanticCommand(
      app,
      menu.goToLiners,
      {
        label: trans.__('Go to Line…')
      },
      trans
    )
  );
}

/**
 * Create the basic `File` menu.
 */
export function createFileMenu(
  app: JupyterFrontEnd,
  menu: IFileMenu,
  router: IRouter,
  trans: TranslationBundle
): void {
  const commands = app.commands;

  // Add a delegator command for closing and cleaning up an activity.
  // This one is a bit different, in that we consider it enabled
  // even if it cannot find a delegate for the activity.
  // In that case, we instead call the application `close` command.
  commands.addCommand(CommandIDs.closeAndCleanup, {
    ...createSemanticCommand(
      app,
      menu.closeAndCleaners,
      {
        execute: 'application:close',
        label: trans.__('Close and Shut Down'),
        isEnabled: true
      },
      trans
    ),
    isEnabled: () =>
      !!app.shell.currentWidget && !!app.shell.currentWidget.title.closable
  });

  // Add a delegator command for creating a console for an activity.
  commands.addCommand(
    CommandIDs.createConsole,
    createSemanticCommand(
      app,
      menu.consoleCreators,
      {
        label: trans.__('New Console for Activity')
      },
      trans
    )
  );

  commands.addCommand(CommandIDs.shutdown, {
    label: trans.__('Shut Down'),
    caption: trans.__('Shut down JupyterLab'),
    isVisible: () => menu.quitEntry,
    isEnabled: () => menu.quitEntry,
    execute: () => {
      return showDialog({
        title: trans.__('Shutdown confirmation'),
        body: trans.__('Please confirm you want to shut down JupyterLab.'),
        buttons: [
          Dialog.cancelButton(),
          Dialog.warnButton({ label: trans.__('Shut Down') })
        ]
      }).then(async result => {
        if (result.button.accept) {
          const setting = ServerConnection.makeSettings();
          const apiURL = URLExt.join(setting.baseUrl, 'api/shutdown');

          // Shutdown all kernel and terminal sessions before shutting down the server
          // If this fails, we continue execution so we can post an api/shutdown request
          try {
            await Promise.all([
              app.serviceManager.sessions.shutdownAll(),
              app.serviceManager.terminals.shutdownAll()
            ]);
          } catch (e) {
            // Do nothing
            console.log(`Failed to shutdown sessions and terminals: ${e}`);
          }

          return ServerConnection.makeRequest(
            apiURL,
            { method: 'POST' },
            setting
          )
            .then(result => {
              if (result.ok) {
                // Close this window if the shutdown request has been successful
                const body = document.createElement('div');
                const p1 = document.createElement('p');
                p1.textContent = trans.__(
                  'You have shut down the Jupyter server. You can now close this tab.'
                );
                const p2 = document.createElement('p');
                p2.textContent = trans.__(
                  'To use JupyterLab again, you will need to relaunch it.'
                );

                body.appendChild(p1);
                body.appendChild(p2);
                void showDialog({
                  title: trans.__('Server stopped'),
                  body: new Widget({ node: body }),
                  buttons: []
                });
                window.close();
              } else {
                throw new ServerConnection.ResponseError(result);
              }
            })
            .catch(data => {
              throw new ServerConnection.NetworkError(data);
            });
        }
      });
    }
  });

  commands.addCommand(CommandIDs.logout, {
    label: trans.__('Log Out'),
    caption: trans.__('Log out of JupyterLab'),
    isVisible: () => menu.quitEntry,
    isEnabled: () => menu.quitEntry,
    execute: () => {
      router.navigate('/logout', { hard: true });
    }
  });
}

/**
 * Create the basic `Kernel` menu.
 */
export function createKernelMenu(
  app: JupyterFrontEnd,
  menu: IKernelMenu,
  trans: TranslationBundle
): void {
  const commands = app.commands;

  commands.addCommand(CommandIDs.interruptKernel, {
    ...createSemanticCommand(
      app,
      menu.kernelUsers.interruptKernel,
      {
        label: trans.__('Interrupt Kernel'),
        caption: trans.__('Interrupt the kernel')
      },
      trans
    ),
    icon: args => (args.toolbar ? stopIcon : undefined)
  });

  commands.addCommand(
    CommandIDs.reconnectToKernel,
    createSemanticCommand(
      app,
      menu.kernelUsers.reconnectToKernel,
      {
        label: trans.__('Reconnect to Kernel')
      },
      trans
    )
  );

  commands.addCommand(CommandIDs.restartKernel, {
    ...createSemanticCommand(
      app,
      menu.kernelUsers.restartKernel,
      {
        label: trans.__('Restart Kernel…'),
        caption: trans.__('Restart the kernel')
      },
      trans
    ),
    icon: args => (args.toolbar ? refreshIcon : undefined)
  });

  commands.addCommand(
    CommandIDs.restartKernelAndClear,
    createSemanticCommand(
      app,
      [menu.kernelUsers.restartKernel, menu.kernelUsers.clearWidget],
      {
        label: trans.__('Restart Kernel and Clear…')
      },
      trans
    )
  );

  commands.addCommand(
    CommandIDs.changeKernel,
    createSemanticCommand(
      app,
      menu.kernelUsers.changeKernel,
      {
        label: trans.__('Change Kernel…')
      },
      trans
    )
  );

  commands.addCommand(
    CommandIDs.shutdownKernel,
    createSemanticCommand(
      app,
      menu.kernelUsers.shutdownKernel,
      {
        label: trans.__('Shut Down Kernel'),
        caption: trans.__('Shut down kernel')
      },
      trans
    )
  );

  commands.addCommand(CommandIDs.shutdownAllKernels, {
    label: trans.__('Shut Down All Kernels…'),
    isEnabled: () => {
      return !app.serviceManager.sessions.running().next().done;
    },
    execute: () => {
      return showDialog({
        title: trans.__('Shut Down All?'),
        body: trans.__('Shut down all kernels?'),
        buttons: [
          Dialog.cancelButton({ label: trans.__('Dismiss') }),
          Dialog.warnButton({ label: trans.__('Shut Down All') })
        ]
      }).then(result => {
        if (result.button.accept) {
          return app.serviceManager.sessions.shutdownAll();
        }
      });
    }
  });
}

/**
 * Create the basic `View` menu.
 */
export function createViewMenu(
  app: JupyterFrontEnd,
  menu: IViewMenu,
  trans: TranslationBundle
): void {
  const commands = app.commands;

  commands.addCommand(
    CommandIDs.lineNumbering,
    createSemanticCommand(
      app,
      menu.editorViewers.toggleLineNumbers,
      {
        label: trans.__('Show Line Numbers')
      },
      trans
    )
  );

  commands.addCommand(
    CommandIDs.matchBrackets,
    createSemanticCommand(
      app,
      menu.editorViewers.toggleMatchBrackets,
      {
        label: trans.__('Match Brackets')
      },
      trans
    )
  );

  commands.addCommand(
    CommandIDs.wordWrap,
    createSemanticCommand(
      app,
      menu.editorViewers.toggleWordWrap,
      {
        label: trans.__('Wrap Words')
      },
      trans
    )
  );
}

/**
 * Create the basic `Run` menu.
 */
export function createRunMenu(
  app: JupyterFrontEnd,
  menu: IRunMenu,
  trans: TranslationBundle
): void {
  const commands = app.commands;

  commands.addCommand(CommandIDs.run, {
    ...createSemanticCommand(
      app,
      menu.codeRunners.run,
      {
        label: trans.__('Run Selected'),
        caption: trans.__('Run Selected')
      },
      trans
    ),
    icon: args => (args.toolbar ? runIcon : undefined)
  });

  commands.addCommand(
    CommandIDs.runAll,
    createSemanticCommand(
      app,
      menu.codeRunners.runAll,
      {
        label: trans.__('Run All'),
        caption: trans.__('Run All')
      },
      trans
    )
  );

  commands.addCommand(CommandIDs.restartAndRunAll, {
    ...createSemanticCommand(
      app,
      [menu.codeRunners.restart, menu.codeRunners.runAll],
      {
        label: trans.__('Restart Kernel and Run All'),
        caption: trans.__('Restart Kernel and Run All')
      },
      trans
    )
  });
}

/**
 * Create the basic `Tabs` menu.
 */
export function createTabsMenu(
  app: JupyterFrontEnd,
  menu: ITabsMenu,
  labShell: ILabShell | null,
  trans: TranslationBundle
): void {
  const commands = app.commands;

  // A list of the active tabs in the main area.
  const tabGroup: Menu.IItemOptions[] = [];
  // A disposable for getting rid of the out-of-date tabs list.
  let disposable: IDisposable;

  // Command to activate a widget by id.
  commands.addCommand(CommandIDs.activateById, {
    label: args => {
      if (args.id === undefined) {
        return trans.__('Activate a widget by its `id`.');
      }
      const id = args['id'] || '';
      const widget = find(app.shell.widgets('main'), w => w.id === id);
      return (widget && widget.title.label) || '';
    },
    isToggled: args => {
      const id = args['id'] || '';
      return !!app.shell.currentWidget && app.shell.currentWidget.id === id;
    },
    execute: args => app.shell.activateById((args['id'] as string) || '')
  });

  let previousId = '';
  // Command to toggle between the current
  // tab and the last modified tab.
  commands.addCommand(CommandIDs.activatePreviouslyUsedTab, {
    label: trans.__('Activate Previously Used Tab'),
    isEnabled: () => !!previousId,
    execute: () => commands.execute(CommandIDs.activateById, { id: previousId })
  });

  if (labShell) {
    void app.restored.then(() => {
      // Iterate over the current widgets in the
      // main area, and add them to the tab group
      // of the menu.
      const populateTabs = () => {
        // remove the previous tab list
        if (disposable && !disposable.isDisposed) {
          disposable.dispose();
        }
        tabGroup.length = 0;

        let isPreviouslyUsedTabAttached = false;
        for (const widget of app.shell.widgets('main')) {
          if (widget.id === previousId) {
            isPreviouslyUsedTabAttached = true;
          }
          tabGroup.push({
            command: CommandIDs.activateById,
            args: { id: widget.id }
          });
        }
        disposable = menu.addGroup(tabGroup, 1);
        previousId = isPreviouslyUsedTabAttached ? previousId : '';
      };
      populateTabs();
      labShell.layoutModified.connect(() => {
        populateTabs();
      });
      // Update the ID of the previous active tab if a new tab is selected.
      labShell.currentChanged.connect((_, args) => {
        const widget = args.oldValue;
        if (!widget) {
          return;
        }
        previousId = widget.id;
      });
    });
  }
}

/**
 * Create the basic `Help` menu.
 */
export function createHelpMenu(
  app: JupyterFrontEnd,
  menu: IHelpMenu,
  trans: TranslationBundle
): void {
  app.commands.addCommand(
    CommandIDs.getKernel,
    createSemanticCommand(
      app,
      menu.getKernel,
      {
        label: trans.__('Get Kernel'),
        isVisible: false
      },
      trans
    )
  );
}

export default plugin;

/**
 * A namespace for Private data.
 */
namespace Private {
  async function displayInformation(trans: TranslationBundle): Promise<void> {
    const result = await showDialog({
      title: trans.__('Information'),
      body: trans.__(
        'Menu customization has changed. You will need to reload JupyterLab to see the changes.'
      ),
      buttons: [
        Dialog.cancelButton(),
        Dialog.okButton({ label: trans.__('Reload') })
      ]
    });

    if (result.button.accept) {
      location.reload();
    }
  }

  export async function loadSettingsMenu(
    registry: ISettingRegistry,
    addMenu: (menu: Menu) => void,
    menuFactory: (options: IMainMenu.IMenuOptions) => JupyterLabMenu,
    translator: ITranslator
  ): Promise<void> {
    const trans = translator.load('jupyterlab');
    let canonical: ISettingRegistry.ISchema | null = null;
    let loaded: { [name: string]: ISettingRegistry.IMenu[] } = {};

    /**
     * Populate the plugin's schema defaults.
     */
    function populate(schema: ISettingRegistry.ISchema) {
      loaded = {};
      const pluginDefaults = Object.keys(registry.plugins)
        .map(plugin => {
          const menus =
            registry.plugins[plugin]!.schema['jupyter.lab.menus']?.main ?? [];
          loaded[plugin] = menus;
          return menus;
        })
        .concat([schema['jupyter.lab.menus']?.main ?? []])
        .reduceRight(
          (acc, val) => SettingRegistry.reconcileMenus(acc, val, true),
          schema.properties!.menus.default as any[]
        );

      // Apply default value as last step to take into account overrides.json
      // The standard default being [] as the plugin must use `jupyter.lab.menus.main`
      // to define their default value.
      schema.properties!.menus.default = SettingRegistry.reconcileMenus(
        pluginDefaults,
        schema.properties!.menus.default as any[],
        true
      )
        // flatten one level
        .sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity));
    }

    // Transform the plugin object to return different schema than the default.
    registry.transform(PLUGIN_ID, {
      compose: plugin => {
        // Only override the canonical schema the first time.
        if (!canonical) {
          canonical = JSONExt.deepCopy(plugin.schema);
          populate(canonical);
        }

        const defaults = canonical.properties?.menus?.default ?? [];
        const user = {
          ...plugin.data.user,
          menus: plugin.data.user.menus ?? []
        };
        const composite = {
          ...plugin.data.composite,
          menus: SettingRegistry.reconcileMenus(
            defaults as ISettingRegistry.IMenu[],
            user.menus as ISettingRegistry.IMenu[]
          )
        };

        plugin.data = { composite, user };

        return plugin;
      },
      fetch: plugin => {
        // Only override the canonical schema the first time.
        if (!canonical) {
          canonical = JSONExt.deepCopy(plugin.schema);
          populate(canonical);
        }

        return {
          data: plugin.data,
          id: plugin.id,
          raw: plugin.raw,
          schema: canonical,
          version: plugin.version
        };
      }
    });

    // Repopulate the canonical variable after the setting registry has
    // preloaded all initial plugins.
    const settings = await registry.load(PLUGIN_ID);

    const currentMenus: ISettingRegistry.IMenu[] =
      JSONExt.deepCopy(settings.composite.menus as any) ?? [];
    const menus = new Array<Menu>();
    // Create menu for non-disabled element
    MenuFactory.createMenus(
      currentMenus
        .filter(menu => !menu.disabled)
        .map(menu => {
          return {
            ...menu,
            items: SettingRegistry.filterDisabledItems(menu.items ?? [])
          };
        }),
      menuFactory
    ).forEach(menu => {
      menus.push(menu);
      addMenu(menu);
    });

    settings.changed.connect(() => {
      // As extension may change menu through API, prompt the user to reload if the
      // menu has been updated.
      const newMenus = (settings.composite.menus as any) ?? [];
      if (!JSONExt.deepEqual(currentMenus, newMenus)) {
        void displayInformation(trans);
      }
    });

    registry.pluginChanged.connect(async (sender, plugin) => {
      if (plugin !== PLUGIN_ID) {
        // If the plugin changed its menu.
        const oldMenus = loaded[plugin] ?? [];
        const newMenus =
          registry.plugins[plugin]!.schema['jupyter.lab.menus']?.main ?? [];
        if (!JSONExt.deepEqual(oldMenus, newMenus)) {
          if (loaded[plugin]) {
            // The plugin has changed, request the user to reload the UI - this should not happen
            await displayInformation(trans);
          } else {
            // The plugin was not yet loaded when the menu was built => update the menu
            loaded[plugin] = JSONExt.deepCopy(newMenus);
            // Merge potential disabled state
            const toAdd = SettingRegistry.reconcileMenus(
              newMenus,
              currentMenus,
              false,
              false
            )
              .filter(menu => !menu.disabled)
              .map(menu => {
                return {
                  ...menu,
                  items: SettingRegistry.filterDisabledItems(menu.items ?? [])
                };
              });

            MenuFactory.updateMenus(menus, toAdd, menuFactory).forEach(menu => {
              addMenu(menu);
            });
          }
        }
      }
    });
  }
}
