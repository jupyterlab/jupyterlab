// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Menu
} from '@phosphor/widgets';

import {
  JupyterLab, JupyterLabPlugin
} from '@jupyterlab/application';

import {
  ICommandPalette, IMainMenu
} from '@jupyterlab/apputils';

import {
  IEditorServices
} from '@jupyterlab/codeeditor';

import {
  editorServices, CodeMirrorEditor
} from '@jupyterlab/codemirror';

import {
  IEditorTracker
} from '@jupyterlab/editorwidget';


/**
 * The command IDs used by the codemirror plugin.
 */
namespace CommandIDs {
  export
  const matchBrackets = 'codemirror:match-brackets';

  export
  const vimMode = 'codemirror:vim-mode';

  export
  const changeTheme = 'codemirror:change-theme';
};


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
  id: 'jupyter.services.codemirror-commands',
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
 * Set up the editor widget menu and commands.
 */
function activateEditorCommands(app: JupyterLab, tracker: IEditorTracker, mainMenu: IMainMenu, palette: ICommandPalette): void {
  let { commands } = app;

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
    let theme = new Menu({ commands });
    let menu = new Menu({ commands });

    menu.title.label = 'Editor';
    theme.title.label = 'Theme';

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
      command: 'codemirror:change-theme',
      args: { theme: name }
    }));

    menu.addItem({ command: 'editor:line-numbers' });
    menu.addItem({ command: 'editor:line-wrap' });
    menu.addItem({ command: CommandIDs.matchBrackets });
    menu.addItem({ command: CommandIDs.vimMode });
    menu.addItem({ type: 'separator' });
    menu.addItem({ type: 'submenu', submenu: theme });

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
    'editor:line-numbers',
    'editor:line-wrap',
    CommandIDs.matchBrackets,
    CommandIDs.vimMode,
    'editor-create-console',
    'editor:run-code'
  ].forEach(command => palette.addItem({ command, category: 'Editor' }));

}
