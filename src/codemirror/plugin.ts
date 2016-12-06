// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import 'codemirror/addon/edit/matchbrackets.js';
import 'codemirror/addon/edit/closebrackets.js';
import 'codemirror/addon/comment/comment.js';
import 'codemirror/keymap/vim.js';

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
  editorServices, CodeMirrorEditor, DEFAULT_CODEMIRROR_THEME
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
 * The map of command ids used by the editor.
 */
const cmdIds = {
  lineNumbers: 'editor:line-numbers',
  lineWrap: 'editor:line-wrap',
  matchBrackets: 'editor:match-brackets',
  vimMode: 'editor:vim-mode',
  changeTheme: 'editor:change-theme',
  createConsole: 'editor:create-console',
  runCode: 'editor:run-code'
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

    settings.addItem({ command: cmdIds.lineNumbers });
    settings.addItem({ command: cmdIds.lineWrap });
    settings.addItem({ command: cmdIds.matchBrackets });
    settings.addItem({ command: cmdIds.vimMode });

    commands.addCommand(cmdIds.changeTheme, {
      label: args => args['theme'] as string,
      execute: args => {
        let name: string = args['theme'] as string || DEFAULT_CODEMIRROR_THEME;
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

  commands.addCommand(cmdIds.matchBrackets, {
    execute: () => { toggleMatchBrackets(); },
    label: 'Toggle Match Brackets',
  });

  commands.addCommand(cmdIds.vimMode, {
    execute: () => { toggleVim(); },
    label: 'Toggle Vim Mode'
  });

  [
    cmdIds.lineNumbers,
    cmdIds.lineWrap,
    cmdIds.matchBrackets,
    cmdIds.vimMode,
    cmdIds.createConsole,
    cmdIds.runCode,
  ].forEach(command => palette.addItem({ command, category: 'Editor' }));

}
