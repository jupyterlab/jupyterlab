// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Menu
} from 'phosphor/lib/ui/menu';

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  IDocumentRegistry
} from '../docregistry';

import {
  EditorWidgetFactory, EditorWidget
} from './widget';

import {
  ICommandPalette
} from '../commandpalette';

import {
  IMainMenu
} from '../mainmenu/plugin';

import {
  WidgetTracker
} from '../widgettracker';

import {
  IEditorTracker
} from './index';

import 'codemirror/theme/material.css';
import 'codemirror/theme/zenburn.css';
import 'codemirror/theme/abcdef.css';
import 'codemirror/theme/base16-light.css';
import 'codemirror/theme/base16-dark.css';
import 'codemirror/theme/dracula.css';
import 'codemirror/theme/hopscotch.css';
import 'codemirror/theme/mbo.css';
import 'codemirror/theme/mdn-like.css';
import 'codemirror/theme/seti.css';
import 'codemirror/theme/the-matrix.css';
import 'codemirror/theme/xq-light.css';
import 'codemirror/addon/edit/matchbrackets.js';
import 'codemirror/addon/edit/closebrackets.js';
import 'codemirror/addon/comment/comment.js';
import 'codemirror/keymap/vim.js';


/**
 * The class name for all main area portrait tab icons.
 */
const PORTRAIT_ICON_CLASS = 'jp-MainAreaPortraitIcon';

/**
 * The class name for the text editor icon from the default theme.
 */
const EDITOR_ICON_CLASS = 'jp-ImageTextEditor';


/**
 * The editor handler extension.
 */
export
const editorHandlerProvider: JupyterLabPlugin<IEditorTracker> = {
  id: 'jupyter.services.editor-handler',
  requires: [IDocumentRegistry, IMainMenu, ICommandPalette],
  provides: IEditorTracker,
  activate: activateEditorHandler,
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
  defaultMode: 'editor:default-mode',
  closeAll: 'editor:close-all',
  changeTheme: 'editor:change-theme'
};


/**
 * Sets up the editor widget
 */
function activateEditorHandler(app: JupyterLab, registry: IDocumentRegistry, mainMenu: IMainMenu, palette: ICommandPalette): IEditorTracker {
  let tracker = new WidgetTracker<EditorWidget>();
  let widgetFactory = new EditorWidgetFactory();
  widgetFactory.widgetCreated.connect((sender, widget) => {
    widget.title.icon = `${PORTRAIT_ICON_CLASS} ${EDITOR_ICON_CLASS}`;
    tracker.addWidget(widget);
  });
  registry.addWidgetFactory(widgetFactory,
  {
    fileExtensions: ['*'],
    displayName: 'Editor',
    modelName: 'text',
    defaultFor: ['*'],
    preferKernel: false,
    canStartKernel: false
  });

  mainMenu.addMenu(createMenu(app, tracker), {rank: 30});

  addCommands(app, tracker);

  [
    cmdIds.lineNumbers,
    cmdIds.lineWrap,
    cmdIds.matchBrackets,
    cmdIds.defaultMode,
    cmdIds.vimMode,
    cmdIds.closeAll,
  ].forEach(command => palette.addItem({ command, category: 'Editor' }));

  return tracker;
}


/**
 * Add the editor commands to the application's command registry.
 */
function addCommands(app: JupyterLab, tracker: WidgetTracker<EditorWidget>): void {
  app.commands.addCommand(cmdIds.lineNumbers, {
    execute: () => { toggleLineNums(tracker); },
    label: 'Toggle Line Numbers',
  });
  app.commands.addCommand(cmdIds.lineWrap, {
    execute: () => { toggleLineWrap(tracker); },
    label: 'Toggle Line Wrap',
  });
  app.commands.addCommand(cmdIds.matchBrackets, {
    execute: () => { toggleMatchBrackets(tracker); },
    label: 'Toggle Match Brackets',
  });
  app.commands.addCommand(cmdIds.defaultMode, {
    execute: () => { toggleDefault(tracker); },
    label: 'Vim Mode Off'
  });
  app.commands.addCommand(cmdIds.vimMode, {
    execute: () => { toggleVim(tracker); },
    label: 'Vim Mode'
  });
  app.commands.addCommand(cmdIds.closeAll, {
    execute: () => { closeAllFiles(tracker); },
    label: 'Close all files'
  });
}


/**
 * Toggle editor line numbers
 */
function toggleLineNums(tracker: WidgetTracker<EditorWidget>) {
  if (tracker.activeWidget) {
    let editor = tracker.activeWidget.editor;
    editor.setOption('lineNumbers', !editor.getOption('lineNumbers'));
  }
}

/**
 * Toggle editor line wrap
 */
function toggleLineWrap(tracker: WidgetTracker<EditorWidget>) {
  if (tracker.activeWidget) {
    let editor = tracker.activeWidget.editor;
    editor.setOption('lineWrapping', !editor.getOption('lineWrapping'));
  }
}

/**
 * Toggle editor matching brackets
 */
function toggleMatchBrackets(tracker: WidgetTracker<EditorWidget>) {
  if (tracker.activeWidget) {
    let editor = tracker.activeWidget.editor;
    editor.setOption('matchBrackets', !editor.getOption('matchBrackets'));
  }
}

/**
 * Turns on the editor's vim mode
 */
function toggleVim(tracker: WidgetTracker<EditorWidget>) {
  let editors = tracker.widgets;
  for (let i = 0; i < editors.length; i++) {
    editors[i].editor.setOption('keyMap', 'vim');
  }
}

/**
 * Sets the editor to default editing mode
 */
function toggleDefault(tracker: WidgetTracker<EditorWidget>) {
  if (tracker.activeWidget) {
    let editors = tracker.widgets;
    for (let i = 0; i < editors.length; i++) {
      editors[i].editor.setOption('keyMap', 'default');
    }
  }
}

/**
 * Close all currently open text editor files
 */
function closeAllFiles(tracker: WidgetTracker<EditorWidget>) {
  if (tracker.activeWidget) {
    let editors = tracker.widgets;
    for (let i = 0; i < editors.length; i++) {
      editors[i].close();
    }
  }
}


/**
 * Create a menu for the editor.
 */
function createMenu(app: JupyterLab, tracker: WidgetTracker<EditorWidget>): Menu {
  let { commands, keymap } = app;
  let settings = new Menu({ commands, keymap });
  let theme = new Menu({ commands, keymap });
  let menu = new Menu({ commands, keymap });

  menu.title.label = 'Editor';
  settings.title.label = 'Settings';
  theme.title.label = 'Theme';

  settings.addItem({ command: cmdIds.lineNumbers });
  settings.addItem({ command: cmdIds.lineWrap });
  settings.addItem({ command: cmdIds.matchBrackets });
  settings.addItem({ command: cmdIds.defaultMode });
  settings.addItem({ command: cmdIds.vimMode });

  commands.addCommand(cmdIds.changeTheme, {
    label: args => {
      return args['theme'] as string;
    },
    execute: args => {
      let editors = tracker.widgets;
      let name: string = args['theme'] as string || 'default';
      for (let i = 0; i < editors.length; i++) {
        editors[i].editor.setOption('theme', name);
      }
    }
  });

  [
   'default', 'abcdef', 'base16-dark', 'base16-light', 'hopscotch',
   'material', 'mbo', 'mdn-like', 'seti', 'the-matrix', 'default',
   'xq-light', 'zenburn'
  ].forEach(name => theme.addItem({
    command: 'editor:change-theme',
    args: { theme: name }
  }));

  menu.addItem({ command: 'file-operations:new-text-file' });
  menu.addItem({ command: 'file-operations:save' });
  menu.addItem({ command: cmdIds.closeAll });
  menu.addItem({ type: 'separator' });
  menu.addItem({ type: 'submenu', menu: settings });
  menu.addItem({ type: 'submenu', menu: theme });

  return menu;
}
