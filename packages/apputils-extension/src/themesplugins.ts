/* -----------------------------------------------------------------------------
| Copyright (c) Jupyter Development Team.
| Distributed under the terms of the Modified BSD License.
|----------------------------------------------------------------------------*/

import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import {
  ICommandPalette,
  ISplashScreen,
  IThemeManager,
  ThemeManager
} from '@jupyterlab/apputils';

import { URLExt } from '@jupyterlab/coreutils';

import { IMainMenu } from '@jupyterlab/mainmenu';

import { ISettingRegistry } from '@jupyterlab/settingregistry';

import { Menu } from '@lumino/widgets';

namespace CommandIDs {
  export const changeTheme = 'apputils:change-theme';

  export const themeScrollbars = 'apputils:theme-scrollbars';

  export const incrFontSize = 'apputils:incr-font-size';

  export const decrFontSize = 'apputils:decr-font-size';
}

/**
 * The default theme manager provider.
 */
export const themesPlugin: JupyterFrontEndPlugin<IThemeManager> = {
  id: '@jupyterlab/apputils-extension:themes',
  requires: [ISettingRegistry, JupyterFrontEnd.IPaths],
  optional: [ISplashScreen],
  activate: (
    app: JupyterFrontEnd,
    settings: ISettingRegistry,
    paths: JupyterFrontEnd.IPaths,
    splash: ISplashScreen | null
  ): IThemeManager => {
    const host = app.shell;
    const commands = app.commands;
    const url = URLExt.join(paths.urls.base, paths.urls.themes);
    const key = themesPlugin.id;
    const manager = new ThemeManager({
      key,
      host,
      settings,
      splash: splash ?? undefined,
      url
    });

    // Keep a synchronously set reference to the current theme,
    // since the asynchronous setting of the theme in `changeTheme`
    // can lead to an incorrect toggle on the currently used theme.
    let currentTheme: string;

    manager.themeChanged.connect((sender, args) => {
      // Set data attributes on the application shell for the current theme.
      currentTheme = args.newValue;
      document.body.dataset.jpThemeLight = String(
        manager.isLight(currentTheme)
      );
      document.body.dataset.jpThemeName = currentTheme;
      if (
        document.body.dataset.jpThemeScrollbars !==
        String(manager.themeScrollbars(currentTheme))
      ) {
        document.body.dataset.jpThemeScrollbars = String(
          manager.themeScrollbars(currentTheme)
        );
      }

      // Set any CSS overrides
      manager.loadCSSOverrides();

      commands.notifyCommandChanged(CommandIDs.changeTheme);
    });

    commands.addCommand(CommandIDs.changeTheme, {
      label: args => {
        const theme = args['theme'] as string;
        return args['isPalette'] ? `Use ${theme} Theme` : theme;
      },
      isToggled: args => args['theme'] === currentTheme,
      execute: args => {
        const theme = args['theme'] as string;
        if (theme === manager.theme) {
          return;
        }
        return manager.setTheme(theme);
      }
    });

    commands.addCommand(CommandIDs.themeScrollbars, {
      label: 'Theme Scrollbars',
      isToggled: () => manager.isToggledThemeScrollbars(),
      execute: () => manager.toggleThemeScrollbars()
    });

    commands.addCommand(CommandIDs.incrFontSize, {
      label: args => `Increase ${args['label']} Font Size`,
      execute: args => manager.incrFontSize(args['key'] as string)
    });

    commands.addCommand(CommandIDs.decrFontSize, {
      label: args => `Decrease ${args['label']} Font Size`,
      execute: args => manager.decrFontSize(args['key'] as string)
    });

    return manager;
  },
  autoStart: true,
  provides: IThemeManager
};

/**
 * The default theme manager's UI command palette and main menu functionality.
 *
 * #### Notes
 * This plugin loads separately from the theme manager plugin in order to
 * prevent blocking of the theme manager while it waits for the command palette
 * and main menu to become available.
 */
export const themesPaletteMenuPlugin: JupyterFrontEndPlugin<void> = {
  id: '@jupyterlab/apputils-extension:themes-palette-menu',
  requires: [IThemeManager],
  optional: [ICommandPalette, IMainMenu],
  activate: (
    app: JupyterFrontEnd,
    manager: IThemeManager,
    palette: ICommandPalette | null,
    mainMenu: IMainMenu | null
  ): void => {
    const commands = app.commands;

    // If we have a main menu, add the theme manager to the settings menu.
    if (mainMenu) {
      const themeMenu = new Menu({ commands });
      themeMenu.title.label = 'JupyterLab Theme';
      void app.restored.then(() => {
        const isPalette = false;

        // choose a theme
        manager.themes.forEach(theme => {
          themeMenu.addItem({
            command: CommandIDs.changeTheme,
            args: { isPalette, theme }
          });
        });
        themeMenu.addItem({ type: 'separator' });

        // toggle scrollbar theming
        themeMenu.addItem({ command: CommandIDs.themeScrollbars });
        themeMenu.addItem({ type: 'separator' });

        // increase/decrease code font size
        themeMenu.addItem({
          command: CommandIDs.incrFontSize,
          args: { label: 'Code', key: 'code-font-size' }
        });
        themeMenu.addItem({
          command: CommandIDs.decrFontSize,
          args: { label: 'Code', key: 'code-font-size' }
        });
        themeMenu.addItem({ type: 'separator' });

        // increase/decrease content font size
        themeMenu.addItem({
          command: CommandIDs.incrFontSize,
          args: { label: 'Content', key: 'content-font-size1' }
        });
        themeMenu.addItem({
          command: CommandIDs.decrFontSize,
          args: { label: 'Content', key: 'content-font-size1' }
        });
        themeMenu.addItem({ type: 'separator' });

        // increase/decrease ui font size
        themeMenu.addItem({
          command: CommandIDs.incrFontSize,
          args: { label: 'UI', key: 'ui-font-size1' }
        });
        themeMenu.addItem({
          command: CommandIDs.decrFontSize,
          args: { label: 'UI', key: 'ui-font-size1' }
        });
      });
      mainMenu.settingsMenu.addGroup(
        [
          {
            type: 'submenu' as Menu.ItemType,
            submenu: themeMenu
          }
        ],
        0
      );
    }

    // If we have a command palette, add theme switching options to it.
    if (palette) {
      void app.restored.then(() => {
        const category = 'Theme';
        const command = CommandIDs.changeTheme;
        const isPalette = true;

        // choose a theme
        manager.themes.forEach(theme => {
          palette.addItem({ command, args: { isPalette, theme }, category });
        });

        // toggle scrollbar theming
        palette.addItem({ command: CommandIDs.themeScrollbars, category });

        // increase/decrease code font size
        palette.addItem({
          command: CommandIDs.incrFontSize,
          args: { label: 'Code', key: 'code-font-size' },
          category
        });
        palette.addItem({
          command: CommandIDs.decrFontSize,
          args: { label: 'Code', key: 'code-font-size' },
          category
        });
        // increase/decrease content font size
        palette.addItem({
          command: CommandIDs.incrFontSize,
          args: { label: 'Content', key: 'content-font-size1' },
          category
        });
        palette.addItem({
          command: CommandIDs.decrFontSize,
          args: { label: 'Content', key: 'content-font-size1' },
          category
        });
        // increase/decrease ui font size
        palette.addItem({
          command: CommandIDs.incrFontSize,
          args: { label: 'UI', key: 'ui-font-size1' },
          category
        });
        palette.addItem({
          command: CommandIDs.decrFontSize,
          args: { label: 'UI', key: 'ui-font-size1' },
          category
        });
      });
    }
  },
  autoStart: true
};
