import { Dialog, showDialog } from '@jupyterlab/apputils';
import { IMainMenu } from '@jupyterlab/mainmenu';
import { ISettingRegistry, SettingRegistry } from '@jupyterlab/settingregistry';

import { ITranslator, TranslationBundle } from '@jupyterlab/translation';

import { JSONExt } from '@lumino/coreutils';

import { Menu } from '@lumino/widgets';

export const PLUGIN_ID = '@jupyterlab/mainmenu-extension:plugin';

export async function loadSettingsMenu(
  registry: ISettingRegistry,
  attachMenu: (menu: Menu) => void,
  menuFactory: (options: IMainMenu.IMenuOptions) => Menu,
  translator: ITranslator
): Promise<void> {
  const trans = translator.load('jupyterlab');
  let canonical: ISettingRegistry.ISchema | null;
  let loaded: { [name: string]: ISettingRegistry.IMenu[] } = {};
  let currentMenus: ISettingRegistry.IMenu[] = [];

  /**
   * Populate the plugin's schema defaults.
   */
  function populate(schema: ISettingRegistry.ISchema) {
    loaded = {};
    schema.properties!.menus.default = Object.keys(registry.plugins)
      .map(plugin => {
        const menus =
          registry.plugins[plugin]!.schema['jupyter.lab.menus'] || [];
        loaded[plugin] = menus;
        return menus;
      })
      .concat([schema.properties!.menus.default as any[]])
      // TODO merge menu tree
      .reduce((acc, val) => acc.concat(val), []) // flatten one level
      .sort((a, b) => a.id.localeCompare(b.id));

    schema.properties!.menus.description = trans.__(
      `Note: To disable a menu or a menu item,
copy it to User Preferences and add the
"disabled" key, for example:
{
  TODO
  "disabled": true
}

Menu description:`
    );
  }

  registry.pluginChanged.connect(async (sender, plugin) => {
    if (plugin !== PLUGIN_ID) {
      // If the plugin changed its menu, reload everything.
      const oldMenus = loaded[plugin] || [];
      const newMenus =
        registry.plugins[plugin]!.schema['jupyter.lab.menus'] || [];
      if (!JSONExt.deepEqual(oldMenus, newMenus)) {
        await displayInformation(trans);
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

  currentMenus = JSONExt.deepCopy(settings.composite.menus as any) ?? [];
  createMenus(currentMenus, menuFactory).forEach(menu => {
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
  menuFactory: (options: IMainMenu.IMenuOptions) => Menu
): Menu[] {
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
  menuFactory: (options: IMainMenu.IMenuOptions) => Menu
): Menu {
  const { id, label } = item;
  const menu = menuFactory({ id, label });
  item.items
    .filter(item => !item.disabled)
    .sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity))
    .map(item => {
      const { command, args, submenu, type } = item;
      // Commands may not have been registered yet; so we don't force it to exist
      menu.addItem({
        command,
        args: args as any,
        submenu: submenu ? dataToMenu(submenu, menuFactory) : null,
        type
      });
    });
  return menu;
}

async function displayInformation(trans: TranslationBundle): Promise<void> {
  await showDialog({
    title: trans.__('Information'),
    body: trans.__(
      'Menu customization has changed. You will need to reload JupyterLab to see the changes.'
    ),
    buttons: [Dialog.okButton()]
  });
}
