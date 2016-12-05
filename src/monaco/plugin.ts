// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Menu
} from 'phosphor/lib/ui/menu';

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  IEditorServices
} from '../codeeditor';

import {
  ICommandPalette
} from '../commandpalette';

import {
  IEditorTracker
} from '../editorwidget';

import {
  IMainMenu
} from '../mainmenu';

import {
  MonacoCodeEditorFactory, MonacoMimeTypeService, MonacoCodeEditor
} from './index';


/**
 * The editor services.
 */
export
const editorServices: JupyterLabPlugin<IEditorServices> = {
  id: IEditorServices.name,
  provides: IEditorServices,
  activate: (): IEditorServices => {
    const factory = new MonacoCodeEditorFactory();
    const mimeTypeService = new MonacoMimeTypeService();
    return { factory, mimeTypeService };
  }
};


/**
 * The editor commands.
 */
export
const editorCommands: JupyterLabPlugin<void> = {
  id: 'jupyter.services.editor-commands',
  requires: [IEditorTracker, IMainMenu, ICommandPalette],
  activate: activateEditorCommands,
  autoStart: true
};

/**
 * The default theme.
 */
const DEFAULT_THEME = 'default-theme';

/**
 * Themes.
 */
const THEMES = [
  'vs', 'vs-dark', 'hc-black'
];


/**
 * The map of command ids used by the editor.
 */
const cmdIds = {
  lineNumbers: 'editor:line-numbers',
  lineWrap: 'editor:line-wrap',
  createConsole: 'editor:create-console',
  runCode: 'editor:run-code',
  changeTheme: 'editor:change-theme'
};


/**
 * Set up the editor widget menu and commands.
 */
function activateEditorCommands(app: JupyterLab, tracker: IEditorTracker, mainMenu: IMainMenu, palette: ICommandPalette): void {
  let { commands, keymap } = app;

  /**
   * Create a menu for the editor.
   */
  function createMenu(): Menu {
    let settings = new Menu({ commands, keymap });
    let themeMenu = new Menu({ commands, keymap });
    let menu = new Menu({ commands, keymap });

    menu.title.label = 'Editor';
    settings.title.label = 'Settings';
    themeMenu.title.label = 'Theme';

    settings.addItem({ command: cmdIds.lineNumbers });

    commands.addCommand(cmdIds.changeTheme, {
      label: args => args['theme'] as string,
      execute: args => {
        let name: string = args['theme'] as string || DEFAULT_THEME;
        tracker.forEach(widget => {
          const editor = widget.editor;
          if (editor instanceof MonacoCodeEditor) {
            editor.editor.updateOptions({
              theme: name
            });
          }
        });
      }
    });

    for (const theme of THEMES) {
      themeMenu.addItem({
        command: cmdIds.changeTheme,
        args: { theme }
      });
    }

    menu.addItem({ type: 'separator' });
    menu.addItem({ type: 'submenu', menu: settings });
    menu.addItem({ type: 'submenu', menu: themeMenu });

    return menu;
  }

  mainMenu.addMenu(createMenu(), { rank: 30 });

  [
    cmdIds.lineNumbers,
    cmdIds.lineWrap,
    cmdIds.createConsole,
    cmdIds.runCode,
  ].forEach(command => palette.addItem({ command, category: 'Editor' }));

}
