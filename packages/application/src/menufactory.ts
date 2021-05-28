import { JupyterLabMenu, IMainMenu } from '@jupyterlab/mainmenu';

import { ISettingRegistry, SettingRegistry } from '@jupyterlab/settingregistry';

import { JSONExt, PartialJSONObject } from '@lumino/coreutils';

/**
 * Helper functions to build a menu from the settings
 */
export namespace MenuFactory {
  /**
   * Create menus from their description
   *
   * @param data Menubar description
   * @param menuFactory Factory for empty menu
   */
  export function createMenus(
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
   * Convert a menu description in a JupyterLabMenu object
   *
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

  /**
   * Convert an item description in a menu item object
   *
   * @param item Menu item
   * @param menu Menu to populate
   * @param menuFactory Empty menu factory
   */
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

  /**
   * Update an existing list of menu and returns
   * the new elements.
   *
   * #### Note
   * New elements are added to the current menu list.
   *
   * @param menus Current menus
   * @param data New description to take into account
   * @param menuFactory Empty menu factory
   * @returns Newly created menus
   */
  export function updateMenus(
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
    menus.push(...newMenus);
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

  /**
   * Options for menu initialization from settings
   */
  export interface IOptions {
    /**
     * Settings registry
     */
    registry: ISettingRegistry;
    /**
     * Plugin ID storing the default definition
     */
    pluginID: string;
    /**
     * Name of the property in the plugin storing the
     * default definition.
     */
    property: string;
    /**
     * Setting schema key storing the definition in all plugins
     */
    schemaKey: string;
    /**
     * Subkey in the object specified by schemaKey
     */
    subKey?: string;
    /**
     * Callback when a plugin schemaKey value is changed.
     *
     * isNew is true if the plugin was not loaded at initialization.
     */
    updateMenus: (
      menus: ISettingRegistry.IMenu[],
      isNew: boolean
    ) => Promise<void>;
  }

  /**
   * Gather all menu definition from the plugin settings
   *
   * @param options Initialization options
   */
  export async function initializeMenus(
    options: MenuFactory.IOptions
  ): Promise<void> {
    const { registry, updateMenus } = options;
    let canonical: ISettingRegistry.ISchema | null;
    let loaded: { [name: string]: ISettingRegistry.IMenu[] } = {};

    /**
     * Populate the plugin's schema defaults.
     */
    function populate(schema: ISettingRegistry.ISchema) {
      loaded = {};
      schema.properties![options.property].default = Object.keys(
        registry.plugins
      )
        .map(plugin => {
          let menus: ISettingRegistry.IMenu[];

          const schemaProperty = registry.plugins[plugin]!.schema[
            options.schemaKey
          ];
          if (options.subKey) {
            menus = (((schemaProperty as PartialJSONObject) ?? {})[
              options.subKey
            ] ?? []) as any[];
          } else {
            menus = (schemaProperty ?? []) as any[];
          }

          loaded[plugin] = menus;
          return loaded[plugin];
        })
        .concat([schema.properties![options.property].default as any[]])
        .reduceRight(
          (acc, val) => SettingRegistry.reconcileMenus(acc, val, true),
          []
        ) // flatten one level
        .sort((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity));
    }

    registry.pluginChanged.connect(async (sender, plugin) => {
      if (plugin !== options.pluginID) {
        // If the plugin changed its menu.
        const oldMenus = loaded[plugin] ?? [];
        let newMenus: ISettingRegistry.IMenu[];

        const schemaProperty = registry.plugins[plugin]!.schema[
          options.schemaKey
        ];
        if (options.subKey) {
          newMenus = (((schemaProperty as PartialJSONObject) ?? {})[
            options.subKey
          ] ?? []) as any[];
        } else {
          newMenus = (schemaProperty ?? []) as any[];
        }

        if (!JSONExt.deepEqual(oldMenus, newMenus)) {
          const isNew = !!loaded[plugin];
          loaded[plugin] = newMenus;
          await updateMenus(loaded[plugin], isNew);
        }
      }
    });

    // Transform the plugin object to return different schema than the default.
    registry.transform(options.pluginID, {
      compose: plugin => {
        // Only override the canonical schema the first time.
        if (!canonical) {
          canonical = JSONExt.deepCopy(plugin.schema);
          populate(canonical);
        }

        const defaults =
          (canonical.properties ?? {})[options.property]?.default ?? [];
        const user = {} as PartialJSONObject;
        user[options.property] = plugin.data.user[options.property] ?? [];
        const composite = {} as PartialJSONObject;
        composite[options.property] = SettingRegistry.reconcileMenus(
          defaults as ISettingRegistry.IMenu[],
          user[options.property] as ISettingRegistry.IMenu[]
        );

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
  }
}
