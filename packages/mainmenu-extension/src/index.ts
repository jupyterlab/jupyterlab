// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
/**
 * @packageDocumentation
 * @module mainmenu-extension
 */

import {
  addSemanticCommand,
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
  MainMenu
} from '@jupyterlab/mainmenu';
import { ServerConnection } from '@jupyterlab/services';
import { ISettingRegistry, SettingRegistry } from '@jupyterlab/settingregistry';
import { ITranslator, TranslationBundle } from '@jupyterlab/translation';
import {
  fastForwardIcon,
  RankedMenu,
  refreshIcon,
  runIcon,
  stopIcon
} from '@jupyterlab/ui-components';
import { find } from '@lumino/algorithm';
import { JSONExt } from '@lumino/coreutils';
import { IDisposable } from '@lumino/disposable';
import { Menu, Widget } from '@lumino/widgets';
import { recentsMenuPlugin } from './recents';

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
  description: 'Adds and provides the application main menu.',
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
        (aMenu: RankedMenu) => {
          menu.addMenu(aMenu, false, { rank: aMenu.rank });
        },
        options => MainMenu.generateMenu(commands, options, trans),
        translator
      );

      // Trigger single update
      menu.update();
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
function createEditMenu(
  app: JupyterFrontEnd,
  menu: IEditMenu,
  trans: TranslationBundle
): void {
  const { commands, shell } = app;
  // Add the undo/redo commands the the Edit menu.
  addSemanticCommand({
    id: CommandIDs.undo,
    commands,
    shell,
    semanticCommands: menu.undoers.undo,
    default: {
      label: trans.__('Undo')
    },
    trans
  });
  addSemanticCommand({
    id: CommandIDs.redo,
    commands,
    shell,
    semanticCommands: menu.undoers.redo,
    default: {
      label: trans.__('Redo')
    },
    trans
  });

  // Add the clear commands to the Edit menu.
  addSemanticCommand({
    id: CommandIDs.clearCurrent,
    commands,
    shell,
    semanticCommands: menu.clearers.clearCurrent,
    default: {
      label: trans.__('Clear')
    },
    trans
  });
  addSemanticCommand({
    id: CommandIDs.clearAll,
    commands,
    shell,
    semanticCommands: menu.clearers.clearAll,
    default: {
      label: trans.__('Clear All')
    },
    trans
  });

  addSemanticCommand({
    id: CommandIDs.goToLine,
    commands,
    shell,
    semanticCommands: menu.goToLiners,
    default: {
      label: trans.__('Go to Line…')
    },
    trans
  });
}

/**
 * Create the basic `File` menu.
 */
function createFileMenu(
  app: JupyterFrontEnd,
  menu: IFileMenu,
  router: IRouter,
  trans: TranslationBundle
): void {
  const { commands, shell } = app;

  // Add a delegator command for closing and cleaning up an activity.
  // This one is a bit different, in that we consider it enabled
  // even if it cannot find a delegate for the activity.
  // In that case, we instead call the application `close` command.
  addSemanticCommand({
    id: CommandIDs.closeAndCleanup,
    commands,
    shell,
    semanticCommands: menu.closeAndCleaners,
    default: {
      execute: 'application:close',
      label: trans.__('Close and Shut Down'),
      isEnabled: true
    },
    overrides: {
      isEnabled: () =>
        !!app.shell.currentWidget && !!app.shell.currentWidget.title.closable
    },
    trans
  });

  // Add a delegator command for creating a console for an activity.
  addSemanticCommand({
    id: CommandIDs.createConsole,
    commands,
    shell,
    semanticCommands: menu.consoleCreators,
    default: {
      label: trans.__('New Console for Activity')
    },
    trans
  });

  commands.addCommand(CommandIDs.shutdown, {
    label: trans.__('Shut Down'),
    caption: trans.__('Shut down %1', app.name),
    isVisible: () => menu.quitEntry,
    isEnabled: () => menu.quitEntry,
    execute: () => {
      return showDialog({
        title: trans.__('Shutdown confirmation'),
        body: trans.__('Please confirm you want to shut down %1.', app.name),
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
                  'To use %1 again, you will need to relaunch it.',
                  app.name
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
    caption: trans.__('Log out of %1', app.name),
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
function createKernelMenu(
  app: JupyterFrontEnd,
  menu: IKernelMenu,
  trans: TranslationBundle
): void {
  const { commands, shell } = app;

  addSemanticCommand({
    id: CommandIDs.interruptKernel,
    commands,
    shell,
    semanticCommands: menu.kernelUsers.interruptKernel,
    default: {
      label: trans.__('Interrupt Kernel'),
      caption: trans.__('Interrupt the kernel')
    },
    overrides: { icon: args => (args.toolbar ? stopIcon : undefined) },
    trans
  });

  addSemanticCommand({
    id: CommandIDs.reconnectToKernel,

    commands,
    shell,
    semanticCommands: menu.kernelUsers.reconnectToKernel,
    default: {
      label: trans.__('Reconnect to Kernel')
    },
    trans
  });

  addSemanticCommand({
    id: CommandIDs.restartKernel,
    commands,
    shell,
    semanticCommands: menu.kernelUsers.restartKernel,
    default: {
      label: trans.__('Restart Kernel…'),
      caption: trans.__('Restart the kernel')
    },
    overrides: { icon: args => (args.toolbar ? refreshIcon : undefined) },
    trans
  });

  addSemanticCommand({
    id: CommandIDs.restartKernelAndClear,
    commands,
    shell,
    semanticCommands: [
      menu.kernelUsers.restartKernel,
      menu.kernelUsers.clearWidget
    ],
    default: {
      label: trans.__('Restart Kernel and Clear…')
    },
    trans
  });

  addSemanticCommand({
    id: CommandIDs.changeKernel,
    commands,
    shell,
    semanticCommands: menu.kernelUsers.changeKernel,
    default: {
      label: trans.__('Change Kernel…')
    },
    trans
  });

  addSemanticCommand({
    id: CommandIDs.shutdownKernel,
    commands,
    shell,
    semanticCommands: menu.kernelUsers.shutdownKernel,
    default: {
      label: trans.__('Shut Down Kernel'),
      caption: trans.__('Shut down kernel')
    },
    trans
  });

  commands.addCommand(CommandIDs.shutdownAllKernels, {
    label: trans.__('Shut Down All Kernels…'),
    isEnabled: () => {
      return !app.serviceManager.sessions.running().next().done;
    },
    execute: () => {
      return showDialog({
        title: trans.__('Shut Down All?'),
        body: trans._n(
          'Are you sure you want to permanently shut down the running kernel?',
          'Are you sure you want to permanently shut down the %1 running kernels?',
          app.serviceManager.kernels.runningCount
        ),
        buttons: [
          Dialog.cancelButton(),
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
function createViewMenu(
  app: JupyterFrontEnd,
  menu: IViewMenu,
  trans: TranslationBundle
): void {
  const { commands, shell } = app;

  addSemanticCommand({
    id: CommandIDs.lineNumbering,
    commands,
    shell,
    semanticCommands: menu.editorViewers.toggleLineNumbers,
    default: {
      label: trans.__('Show Line Numbers')
    },
    trans
  });

  addSemanticCommand({
    id: CommandIDs.matchBrackets,
    commands,
    shell,
    semanticCommands: menu.editorViewers.toggleMatchBrackets,
    default: {
      label: trans.__('Match Brackets')
    },
    trans
  });

  addSemanticCommand({
    id: CommandIDs.wordWrap,
    commands,
    shell,
    semanticCommands: menu.editorViewers.toggleWordWrap,
    default: {
      label: trans.__('Wrap Words')
    },
    trans
  });
}

/**
 * Create the basic `Run` menu.
 */
function createRunMenu(
  app: JupyterFrontEnd,
  menu: IRunMenu,
  trans: TranslationBundle
): void {
  const { commands, shell } = app;

  addSemanticCommand({
    id: CommandIDs.run,
    commands,
    shell,
    semanticCommands: menu.codeRunners.run,
    default: {
      label: trans.__('Run Selected'),
      caption: trans.__('Run Selected')
    },
    overrides: {
      icon: args => (args.toolbar ? runIcon : undefined)
    },
    trans
  });

  addSemanticCommand({
    id: CommandIDs.runAll,
    commands,
    shell,
    semanticCommands: menu.codeRunners.runAll,
    default: {
      label: trans.__('Run All'),
      caption: trans.__('Run All')
    },
    trans
  });

  addSemanticCommand({
    id: CommandIDs.restartAndRunAll,
    commands,
    shell,
    semanticCommands: [menu.codeRunners.restart, menu.codeRunners.runAll],
    default: {
      label: trans.__('Restart Kernel and Run All'),
      caption: trans.__('Restart Kernel and Run All')
    },
    overrides: {
      icon: args => (args.toolbar ? fastForwardIcon : undefined)
    },
    trans
  });
}

/**
 * Create the basic `Tabs` menu.
 */
function createTabsMenu(
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
function createHelpMenu(
  app: JupyterFrontEnd,
  menu: IHelpMenu,
  trans: TranslationBundle
): void {
  const { commands, shell } = app;
  addSemanticCommand({
    id: CommandIDs.getKernel,
    commands,
    shell,
    semanticCommands: menu.getKernel,
    default: {
      label: trans.__('Get Kernel'),
      isVisible: false
    },
    trans
  });
}

export default [plugin, recentsMenuPlugin];

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
    menuFactory: (options: IMainMenu.IMenuOptions) => RankedMenu,
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
