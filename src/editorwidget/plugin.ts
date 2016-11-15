// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import 'codemirror/addon/edit/matchbrackets.js';
import 'codemirror/addon/edit/closebrackets.js';
import 'codemirror/addon/comment/comment.js';
import 'codemirror/keymap/vim.js';

import {
  AttachedProperty
} from 'phosphor/lib/core/properties';

import {
  Menu
} from 'phosphor/lib/ui/menu';

import {
  JupyterLab, JupyterLabPlugin
} from '../application';

import {
  DEFAULT_CODEMIRROR_THEME, CodeMirrorEditor
} from '../codemirror/editor';

import {
  ICommandPalette
} from '../commandpalette';

import {
  InstanceTracker
} from '../common/instancetracker';

import {
  IDocumentRegistry
} from '../docregistry';

import {
  ILayoutRestorer
} from '../layoutrestorer';

import {
  IMainMenu
} from '../mainmenu';

import {
  IStateDB
} from '../statedb';

import {
  IEditorTracker, EditorWidget, EditorWidgetFactory
} from './widget';

import {
  IEditorFactory
} from '../codeeditor';

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
 * The name of the factory that creates editor widgets.
 */
const FACTORY = 'Editor';

/**
 * The map of command ids used by the editor.
 */
const cmdIds = {
  lineNumbers: 'editor:line-numbers',
  lineWrap: 'editor:line-wrap',
  matchBrackets: 'editor:match-brackets',
  vimMode: 'editor:vim-mode',
  closeAll: 'editor:close-all',
  changeTheme: 'editor:change-theme',
  createConsole: 'editor:create-console',
  runCode: 'editor:run-code'
};


/**
 * The editor handler extension.
 */
export
const plugin: JupyterLabPlugin<IEditorTracker> = {
  id: 'jupyter.services.editor-handler',
  requires: [
    IDocumentRegistry, IMainMenu, ICommandPalette, IStateDB, ILayoutRestorer, IEditorFactory
  ],
  provides: IEditorTracker,
  activate: activateEditorHandler,
  autoStart: true
};


/**
 * Sets up the editor widget
 */
function activateEditorHandler(app: JupyterLab, registry: IDocumentRegistry, mainMenu: IMainMenu, palette: ICommandPalette, state: IStateDB, layout: ILayoutRestorer, editorFactory: IEditorFactory): IEditorTracker {
  const factory = new EditorWidgetFactory(editorFactory, {
    name: FACTORY,
    fileExtensions: ['*'],
    defaultFor: ['*']
  });
  const tracker = new InstanceTracker<EditorWidget>({
    restore: {
      state, layout,
      command: 'file-operations:open',
      args: widget => ({ path: widget.context.path, factory: FACTORY }),
      name: widget => widget.context.path,
      namespace: 'editor',
      when: app.started,
      registry: app.commands
    }
  });

  // Sync tracker with currently focused widget.
  app.shell.currentChanged.connect((sender, args) => {
    tracker.sync(args.newValue);
  });

  factory.widgetCreated.connect((sender, widget) => {
    widget.title.icon = `${PORTRAIT_ICON_CLASS} ${EDITOR_ICON_CLASS}`;
    // Notify the instance tracker if restore data needs to update.
    widget.context.pathChanged.connect(() => { tracker.save(widget); });
    tracker.add(widget);
  });
  registry.addWidgetFactory(factory);

  /**
   * An attached property for the session id associated with an editor widget.
   */
  const sessionIdProperty = new AttachedProperty<EditorWidget, string>({
    name: 'sessionId'
  });

  /**
   * Toggle editor line numbers
   */
  function toggleLineNums() {
    if (tracker.currentWidget) {
      const editor = tracker.currentWidget.editor as CodeMirrorEditor;
      editor.editor.setOption('lineNumbers', !editor.editor.getOption('lineNumbers'));
    }
  }

  /**
   * Toggle editor line wrap
   */
  function toggleLineWrap() {
    if (tracker.currentWidget) {
      const editor = tracker.currentWidget.editor as CodeMirrorEditor;
      editor.editor.setOption('lineWrapping', !editor.editor.getOption('lineWrapping'));
    }
  }

  /**
   * Toggle editor matching brackets
   */
  function toggleMatchBrackets() {
    if (tracker.currentWidget) {
      const editor = tracker.currentWidget.editor as CodeMirrorEditor;
      editor.editor.setOption('matchBrackets', !editor.editor.getOption('matchBrackets'));
    }
  }

  /**
   * Toggle the editor's vim mode
   */
  function toggleVim() {
    tracker.forEach(widget => {
      const editor = tracker.currentWidget.editor as CodeMirrorEditor;
      const keymap = editor.editor.getOption('keyMap') === 'vim' ? 'default' : 'vim';
      editor.editor.setOption('keyMap', keymap);
    });
  }

  /**
   * Close all currently open text editor files
   */
  function closeAllFiles() {
    tracker.forEach(widget => { widget.close(); });
  }

  /**
   * Create a menu for the editor.
   */
  function createMenu(app: JupyterLab): Menu {
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
    settings.addItem({ command: cmdIds.vimMode });

    commands.addCommand(cmdIds.changeTheme, {
      label: args => args['theme'] as string,
      execute: args => {
        let name: string = args['theme'] as string || DEFAULT_CODEMIRROR_THEME;
        tracker.forEach(widget => {
          const editor = widget.editor as CodeMirrorEditor;
          editor.editor.setOption('theme', name);
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

    menu.addItem({ command: cmdIds.closeAll });
    menu.addItem({ type: 'separator' });
    menu.addItem({ type: 'submenu', menu: settings });
    menu.addItem({ type: 'submenu', menu: theme });

    return menu;
  }

  mainMenu.addMenu(createMenu(app), {rank: 30});

  let commands = app.commands;

  commands.addCommand(cmdIds.lineNumbers, {
    execute: () => { toggleLineNums(); },
    label: 'Toggle Line Numbers',
  });

  commands.addCommand(cmdIds.lineWrap, {
    execute: () => { toggleLineWrap(); },
    label: 'Toggle Line Wrap',
  });

  commands.addCommand(cmdIds.matchBrackets, {
    execute: () => { toggleMatchBrackets(); },
    label: 'Toggle Match Brackets',
  });

  commands.addCommand(cmdIds.vimMode, {
    execute: () => { toggleVim(); },
    label: 'Toggle Vim Mode'
  });

  commands.addCommand(cmdIds.closeAll, {
    execute: () => { closeAllFiles(); },
    label: 'Close all files'
  });

  commands.addCommand(cmdIds.createConsole, {
    execute: () => {
      let widget = tracker.currentWidget;
      if (!widget) {
        return;
      }
      let options: any = {
        path: widget.context.path,
        preferredLanguage: widget.context.model.defaultKernelLanguage
      };
      commands.execute('console:create', options).then(id => {
        sessionIdProperty.set(widget, id);
      });
    },
    label: 'Create Console for Editor'
  });

  commands.addCommand(cmdIds.runCode, {
    execute: () => {
      let widget = tracker.currentWidget;
      if (!widget) {
        return;
      }
      // Get the session id.
      let id = sessionIdProperty.get(widget);
      if (!id) {
        return;
      }
      // Get the selected code from the editor.
      let editorModel = widget.editor.model;
      let selection = editorModel.selections.front;
      let code = editorModel.value.substring(selection.start, selection.end);
      commands.execute('console:inject', { id, code });
    },
    label: 'Run Code',
  });

  [
    cmdIds.lineNumbers,
    cmdIds.lineWrap,
    cmdIds.matchBrackets,
    cmdIds.vimMode,
    cmdIds.closeAll,
    cmdIds.createConsole,
    cmdIds.runCode,
  ].forEach(command => palette.addItem({ command, category: 'Editor' }));

  return tracker;
}
