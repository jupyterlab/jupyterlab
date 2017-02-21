// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import 'codemirror/addon/edit/matchbrackets.js';
import 'codemirror/addon/edit/closebrackets.js';
import 'codemirror/addon/comment/comment.js';
import 'codemirror/keymap/vim.js';

import {
  Menu
} from '@phosphor/widgetmenu';

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
  editorServices, CodeMirrorEditor
} from '.';


/**
 * The editor services.
 */
export
const servicesPlugin: JupyterLabPlugin<IEditorServices> = {
  id: IEditorServices.name,
  provides: IEditorServices,
  activate: (): IEditorServices => editorServices
};


/**
 * The editor commands.
 */
export
const commandsPlugin: JupyterLabPlugin<void> = {
  id: 'jupyter.services.editor-commands',
  requires: [IEditorTracker, IMainMenu, ICommandPalette],
  activate: activateEditorCommands,
  autoStart: true
};


/**
 * Export the plugins as default.
 */
const plugins: JupyterLabPlugin<any>[] = [commandsPlugin, servicesPlugin];
export default plugins;


/**
 * The command IDs used by the editor plugin.
 */
export
namespace CommandIDs {
  export
  const lineNumbers = 'editor:line-numbers';

  export
  const lineWrap = 'editor:line-wrap';

  export
  const matchBrackets = 'editor:match-brackets';

  export
  const vimMode = 'editor:vim-mode';

  export
  const changeTheme = 'editor:change-theme';

  export
  const createConsole = 'editor:create-console';

  export
  const runCode = 'editor:run-code';
};


/**
 * Set up the editor widget menu and commands.
 */
function activateEditorCommands(app: JupyterLab, tracker: IEditorTracker, mainMenu: IMainMenu, palette: ICommandPalette): void {
  let { commands, keymap } = app;

  /**
   * Toggle editor matching brackets
   */
  function toggleMatchBrackets(): void {
    if (tracker.currentWidget) {
      let editor = tracker.currentWidget.editor;
      if (editor instanceof CodeMirrorEditor) {
        let cm = editor.editor;
        cm.setOption('matchBrackets', !cm.getOption('matchBrackets'));
      }
    }
  }

  /**
   * Toggle the editor's vim mode
   */
  function toggleVim(): void {
    tracker.forEach(widget => {
      if (widget.editor instanceof CodeMirrorEditor) {
        let cm = widget.editor.editor;
        let keymap = cm.getOption('keyMap') === 'vim' ? 'default'
        : 'vim';
        cm.setOption('keyMap', keymap);
      }
    });
  }

  /**
   * Create a menu for the editor.
   */
  function createMenu(): Menu {
    let settings = new Menu({ commands, keymap });
    let theme = new Menu({ commands, keymap });
    let menu = new Menu({ commands, keymap });

    menu.title.label = 'Editor';
    settings.title.label = 'Settings';
    theme.title.label = 'Theme';

    settings.addItem({ command: CommandIDs.lineNumbers });
    settings.addItem({ command: CommandIDs.lineWrap });
    settings.addItem({ command: CommandIDs.matchBrackets });
    settings.addItem({ command: CommandIDs.vimMode });

    commands.addCommand(CommandIDs.changeTheme, {
      label: args => args['theme'] as string,
      execute: args => {
        let name = args['theme'] as string || CodeMirrorEditor.DEFAULT_THEME;
        tracker.forEach(widget => {
          if (widget.editor instanceof CodeMirrorEditor) {
            let cm = widget.editor.editor;
            cm.setOption('theme', name);
          }
        });
      }
    });

    [
     'jupyter', 'default', 'abcdef', 'base16-dark', 'base16-light',
     'hopscotch', 'material', 'mbo', 'mdn-like', 'seti', 'the-matrix',
     'xq-light', 'zenburn'
    ].forEach(name => theme.addItem({
      command: 'editor:change-theme',
      args: { theme: name }
    }));

    menu.addItem({ type: 'separator' });
    menu.addItem({ type: 'submenu', menu: settings });
    menu.addItem({ type: 'submenu', menu: theme });

    return menu;
  }

  mainMenu.addMenu(createMenu(), { rank: 30 });

  commands.addCommand(CommandIDs.matchBrackets, {
    execute: () => { toggleMatchBrackets(); },
    label: 'Toggle Match Brackets',
  });

  commands.addCommand(CommandIDs.vimMode, {
    execute: () => { toggleVim(); },
    label: 'Toggle Vim Mode'
  });

  [
    CommandIDs.lineNumbers,
    CommandIDs.lineWrap,
    CommandIDs.matchBrackets,
    CommandIDs.vimMode,
    CommandIDs.createConsole,
    CommandIDs.runCode
  ].forEach(command => palette.addItem({ command, category: 'Editor' }));

}
