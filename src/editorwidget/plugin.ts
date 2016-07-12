// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  Application
} from 'phosphide/lib/core/application';

import {
  DocumentRegistry, IWidgetFactoryOptions
} from '../docregistry';

import {
  EditorWidgetFactory, EditorWidget
} from './widget';

import {
  MainMenu
} from '../mainmenu/plugin';

import {
  WidgetTracker
} from '../widgettracker';

import {
  MenuItem, Menu
} from 'phosphor-menus';

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
import 'codemirror/keymap/vim.js';

export
class EditorTracker extends WidgetTracker<EditorWidget> { }

export
let tracker = new EditorTracker();

let currentApp : Application;
let activeEditor : EditorWidget;
tracker.activeWidgetChanged.connect((sender, widget) => {
  activeEditor = widget;
});

/**
 * The class name for all main area portrait tab icons.
 */
const PORTRAIT_ICON_CLASS = 'jp-MainAreaPortraitIcon';

/**
 * The class name for the text editor icon from the default theme.
 */
const TEXTEDITOR_ICON_CLASS = 'jp-ImageTextEditor';


/**
 * The editor handler extension.
 */
export
const editorHandlerExtension = {
  id: 'jupyter.extensions.editorHandler',
  requires: [DocumentRegistry, MainMenu],
  activate: activateEditorHandler
};

/**
 * Sets up the editor widget
 */
function activateEditorHandler(app: Application, registry: DocumentRegistry, mainMenu: MainMenu) {
  let saveFile = 'editor:save-file';
  let lineNumbers = 'editor:line-numbers';
  let lineWrap = 'editor:line-wrap';
  let matchBrackets = 'editor:match-brackets';
  let vimMode = 'editor:vim-mode';
  let defaultMode = 'editor:default-mode';
  let closeAll = 'editor:close-all';

  let editorMenu = new MenuItem({
    text: 'Editor',
    submenu: menu
  });
  currentApp = app;
  mainMenu.addItem(editorMenu);
  registry.addWidgetFactory(new EditorWidgetFactory(),
  {
    fileExtensions: ['.*'],
    displayName: 'Editor',
    modelName: 'text',
    defaultFor: ['.*'],
    preferKernel: false,
    canStartKernel: false
  });

  app.commands.add([
  {
    id: saveFile,
    handler: saveDoc
  },
  {
    id: lineNumbers,
    handler: toggleLineNums
  },
  {
    id: lineWrap,
    handler: toggleLineWrap
  },
  {
    id: matchBrackets,
    handler: toggleMatchBrackets
  },
  {
    id: defaultMode,
    handler: toggleDefault
  },
  {
    id: vimMode,
    handler: toggleVim
  },
  {
    id: closeAll,
    handler: closeAllFiles
  }
  ]);

  app.palette.add([
  {
    command: saveFile,
    category: 'Editor',
    text: 'Save File',
    caption: 'Save the currently open text file'
  },
  {
    command: lineNumbers,
    category: 'Editor',
    text: 'Line Numbers',
    caption: 'Toggles the line numbers on the editor'
  },
  {
    command: lineWrap,
    category: 'Editor',
    text: 'Line Wrap',
    caption: 'Toggles line wrapping on the editor'
  },
  {
    command: matchBrackets,
    category: 'Editor',
    text: 'Match Brackets',
    caption: 'Toggles bracket matching on the editor'
  },
  {
    command: defaultMode,
    category: 'Editor',
    text: 'Vim Mode Off',
    caption: 'Turns off vim mode (default)'
  },
  {
    command: vimMode,
    category: 'Editor',
    text: 'Vim Mode',
    caption: 'Turns on vim mode'
  },
  {
    command: closeAll,
    category: 'Editor',
    text: 'Close all files',
    caption: 'Closes all currently open text files'
  }
  ]);
}

let liNums = true;
let liWrap = false;
let matchBracks = false;

/**
 * Saves the current document
 */
function saveDoc() {
  currentApp.commands.execute('file-operations:save');
}

/**
 * Toggle editor line numbers
 */
function toggleLineNums() {
  if (!tracker.isDisposed) {
    let editors = tracker.widgets;
    liNums = !liNums;
    for (let i = 0; i < editors.length; i++) {
      editors[i].editor.setOption('lineNumbers', liNums);
    }
  }
}

/**
 * Toggle editor line wrap
 */
function toggleLineWrap() {
  if (!tracker.isDisposed) {
    let editors = tracker.widgets;
    liWrap = !liWrap;
    for (let i = 0; i < editors.length; i++) {
      editors[i].editor.setOption('lineWrap', liWrap);
    }
  }
}

/**
 * Toggle editor matching brackets
 */
function toggleMatchBrackets() {
  if (!tracker.isDisposed) {
    let editors = tracker.widgets;
    matchBracks = !matchBracks;
    for (let i = 0; i < editors.length; i++) {
      editors[i].editor.setOption('matchBrackets', matchBracks);
    }
  }
}

/**
 * Turns on the editor's vim mode
 */
function toggleVim() {
  let editors = tracker.widgets;
  for (let i = 0; i < editors.length; i++) {
    editors[i].editor.setOption('keyMap', 'vim');
  }
}

/**
 * Sets the editor to default editing mode
 */
function toggleDefault() {
  if (!tracker.isDisposed) {
    let editors = tracker.widgets;
    for (let i = 0; i < editors.length; i++) {
      editors[i].editor.setOption('keyMap', 'default');
    }
  }
}

/**
 * Close all currently open text editor files
 */
function closeAllFiles() {
  if (!tracker.isDisposed) {
    let editors = tracker.widgets;
    for (let i = 0; i < editors.length; i++) {
      editors[i].close();
    }
  }
}

/**
 * Handlers and menu items for the editor widget menu bar item
 */
let themeHandler = (item : MenuItem) => {
  let editors = tracker.widgets;
  for (let i = 0; i < editors.length; i++) {
    editors[i].editor.setOption('theme', item.text);
  }
};

let file = new Menu([
  new MenuItem({
    text: 'Save',
    handler: saveDoc,
    shortcut: 'Cmd+S'
  }),
  new MenuItem({
    text: 'Close all editors',
    handler: closeAllFiles
  })
  ]);

let settings = new Menu([
  new MenuItem({
    text: 'Line Numbers',
    handler: toggleLineNums
  }),
  new MenuItem({
    text: 'Line Wrapping',
    handler: toggleLineWrap
  }),
  new MenuItem({
    text: 'Match Brackets',
    handler: toggleMatchBrackets
  }),
  new MenuItem({
    text: 'Default Mode',
    handler: toggleDefault,
    shortcut: 'Ctrl+D'
  }),
  new MenuItem({
    text: 'Vim Mode',
    handler: toggleVim
  }),
  ]);

let themes = new Menu([
  new MenuItem({
    text: 'default',
    handler: themeHandler
  }),
  new MenuItem({
    text: 'abcdef',
    handler: themeHandler
  }),
  new MenuItem({
    text: 'base16-dark',
    handler: themeHandler
  }),
  new MenuItem({
    text: 'base16-light',
    handler: themeHandler
  }),
  new MenuItem({
    text: 'hopscotch',
    handler: themeHandler
  }),
  new MenuItem({
    text: 'material',
    handler: themeHandler
  }),
  new MenuItem({
    text: 'mbo',
    handler: themeHandler
  }),
  new MenuItem({
    text: 'mdn-like',
    handler: themeHandler
  }),
  new MenuItem({
    text: 'seti',
    handler: themeHandler
  }),
  new MenuItem({
    text: 'the-matrix',
    handler: themeHandler
  }),
  new MenuItem({
    text: 'xq-light',
    handler: themeHandler
  }),
  new MenuItem({
    text: 'zenburn',
    handler: themeHandler
  })
  ]);

let menu = new Menu([
  new MenuItem({
    text: 'Themes',
    submenu: themes
  }),
  new MenuItem({
    text: 'Settings',
    submenu: settings
  }),
  new MenuItem({
    text: 'File',
    submenu: file
  })
  ]);

/**
 * The editor widget tracker provider
 */
export
const editorTrackerProvider = {
  id: 'jupyter.plugins.editorTracker',
  provides: EditorTracker,
  resolve: () => {
    return tracker;
  }
};
