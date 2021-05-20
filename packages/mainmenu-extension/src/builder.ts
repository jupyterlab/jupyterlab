import { Dialog, showDialog } from '@jupyterlab/apputils';
import { JupyterLabMenu, IMainMenu } from '@jupyterlab/mainmenu';
import { ISettingRegistry, SettingRegistry } from '@jupyterlab/settingregistry';

import { ITranslator, TranslationBundle } from '@jupyterlab/translation';

import { JSONExt } from '@lumino/coreutils';

import { Menu } from '@lumino/widgets';

export const PLUGIN_ID = '@jupyterlab/mainmenu-extension:plugin';

export async function loadSettingsMenu(
  registry: ISettingRegistry,
  attachMenu: (menu: Menu) => void,
  menuFactory: (options: IMainMenu.IMenuOptions) => JupyterLabMenu,
  translator: ITranslator
): Promise<void> {
  const trans = translator.load('jupyterlab');
  let canonical: ISettingRegistry.ISchema | null;
  let loaded: { [name: string]: ISettingRegistry.IMenu[] } = {};

  /**
   * Populate the plugin's schema defaults.
   */
  function populate(schema: ISettingRegistry.ISchema) {
    loaded = {};
    schema.properties!.menus.default = Object.keys(registry.plugins)
      .map(plugin => {
        const menus =
          registry.plugins[plugin]!.schema['jupyter.lab.menus']?.main ?? [];
        loaded[plugin] = menus;
        return menus;
      })
      .concat([schema.properties!.menus.default as any[]])
      .reduceRight(
        (acc, val) => SettingRegistry.reconcileMenus(acc, val, true),
        []
      ) // flatten one level
      .sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity));

    schema.properties!.menus.description = trans.__(
      `Note: To disable a menu or a menu item,
copy it to User Preferences and add the
"disabled" key. The following example will disable
the "Tabs" menu and "Restart Kernel and Run up to Selected Cell"
item:
{
  "menus": [
    {
      "id": "jp-mainmenu-tabs",
      "disabled": true
    },
    {
        "id": "jp-mainmenu-kernel",
        "items": [
            {
                "command": "notebook:restart-and-run-to-selected",
                "disabled": true
            }
        ]
    }
  ]
}

Menu description:`,
    );
  }

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
          loaded[plugin] = newMenus;
          updateMenus(menus, loaded[plugin], menuFactory).forEach(menu => {
            attachMenu(menu);
            menus.push(menu);
          });
        }
      }
    }
  });

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
        menus: plugin.data.user.menus ?? []
      };
      const composite = {
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
  canonical = null;

  const settings = await registry.load(PLUGIN_ID);

  const currentMenus = JSONExt.deepCopy(settings.composite.menus as any) ?? [];
  const menus = createMenus(currentMenus, menuFactory);
  menus.forEach(menu => {
    attachMenu(menu);
  });
  settings.changed.connect(() => {
    // As extension may change menu through API, prompt the user to reload if the
    // menu has been updated.
    const newMenus = (settings.composite.menus as any) ?? [];
    if (!JSONExt.deepEqual(currentMenus, newMenus)) {
      void displayInformation(trans);
    }
  });
}

/**
 * Populate a menubar from a menu description
 *
 * @param data Menubar description
 * @param menubar Menubar to populate
 * @param menuFactory Factory for empty menu
 */
function createMenus(
  data: ISettingRegistry.IMenu[],
  menuFactory: (options: IMainMenu.IMenuOptions) => JupyterLabMenu
): JupyterLabMenu[] {
  return data
    .filter(item => !item.disabled)
    .sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity))
    .map(menuItem => {
      return dataToMenu(menuItem, menuFactory);
    });
}

/**
 * Convert a menu description in a Menu object
 * @param item Menu description
 * @param menuFactory Empty menu factory
 * @returns The menu widget
 */
function dataToMenu(
  item: ISettingRegistry.IMenu,
  menuFactory: (options: IMainMenu.IMenuOptions) => JupyterLabMenu
): JupyterLabMenu {
  const { id, label, rank } = item;
  const menu = menuFactory({ id, label, rank });
  item.items
    ?.filter(item => !item.disabled)
    .sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity))
    .map(item => {
      addItem(item, menu, menuFactory);
    });
  return menu;
}

function addItem(
  item: ISettingRegistry.IMenuItem,
  menu: JupyterLabMenu,
  menuFactory: (options: IMainMenu.IMenuOptions) => JupyterLabMenu
) {
  const { command, args, submenu, type, rank } = item;
  // Commands may not have been registered yet; so we don't force it to exist
  menu.addItem({
    command,
    args: args as any,
    submenu: submenu ? dataToMenu(submenu, menuFactory) : null,
    type,
    rank
  });
}

function updateMenus(
  menus: JupyterLabMenu[],
  data: ISettingRegistry.IMenu[],
  menuFactory: (options: IMainMenu.IMenuOptions) => JupyterLabMenu
): JupyterLabMenu[] {
  const newMenus: JupyterLabMenu[] = [];
  data.forEach(item => {
    const menu = menus.find(menu => menu.id === item.id);
    if (menu) {
      mergeMenus(item, menu, menuFactory);
    } else {
      newMenus.push(dataToMenu(item, menuFactory));
    }
  });
  return newMenus;
}

function mergeMenus(
  item: ISettingRegistry.IMenu,
  menu: JupyterLabMenu,
  menuFactory: (options: IMainMenu.IMenuOptions) => JupyterLabMenu
) {
  if (item.disabled) {
    menu.dispose();
  } else {
    item.items?.forEach(entry => {
      const existingItem = menu?.items.find(
        (i, idx) =>
          i.type === entry.type &&
          i.command === entry.command &&
          i.submenu?.id === entry.submenu?.id
      );

      if (existingItem && entry.type !== 'separator') {
        if (entry.disabled) {
          menu.removeItem(existingItem);
        } else {
          switch (entry.type ?? 'command') {
            case 'command':
              if (entry.command) {
                if (!JSONExt.deepEqual(existingItem.args, entry.args ?? {})) {
                  addItem(entry, menu, menuFactory);
                }
              }
              break;
            case 'submenu':
              if (entry.submenu) {
                mergeMenus(
                  entry.submenu,
                  existingItem.submenu as JupyterLabMenu,
                  menuFactory
                );
              }
          }
        }
      } else {
        addItem(entry, menu, menuFactory);
      }
    });
  }
}

async function displayInformation(trans: TranslationBundle): Promise<void> {
  const result = await showDialog({
    title: trans.__('Information'),
    body: trans.__(
      'Menu customization has changed. You will need to reload JupyterLab to see the changes.'
    ),
    buttons: [
      Dialog.cancelButton(),
      Dialog.okButton({ label: trans.__('RELOAD') })
    ]
  });

  if (result.button.accept) {
    location.reload();
  }
}
