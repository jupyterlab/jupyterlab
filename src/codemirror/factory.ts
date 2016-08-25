// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import {
  JSONObject
} from 'phosphor/lib/algorithm/json';

import {
  EditorWidget
} from '../editorwidget/widget';

import {
  DefaultStandaloneEditorWidgetDecorator, StandaloneEditorWidget
} from '../editorwidget/standalone/decorator';

import {
  StandaloneEditorPresenter
} from '../editorwidget/standalone/presenter';

import {
  FocusTracker
} from 'phosphor/lib/ui/focustracker';

import {
  CodeMirroStandaloneEditorWidget
} from './standalone/widget';

import {
  Menu
} from 'phosphor/lib/ui/menu';

import {
  JupyterLab
} from '../application';

import {
  ICommandPalette
} from '../commandpalette';

import {
  each
} from 'phosphor/lib/algorithm/iteration';

import {
  IKernel
} from 'jupyter-js-services';

import {
  ABCWidgetFactory, IDocumentModel, IDocumentContext
} from '../docregistry';

import {
  DEFAULT_CODEMIRROR_THEME
} from './widget';

import 'codemirror/addon/edit/matchbrackets.js';
import 'codemirror/addon/edit/closebrackets.js';
import 'codemirror/addon/comment/comment.js';
import 'codemirror/keymap/vim.js';

/**
 * The theme property name.
 */
const THEME_PROPERTY = 'theme';

/**
 * The available CodeMirror themes.
 */
export
const THEMES = [
  DEFAULT_CODEMIRROR_THEME, 'default', 'abcdef', 'base16-dark', 'base16-light',
  'hopscotch', 'material', 'mbo', 'mdn-like', 'seti', 'the-matrix', 
  'xq-light', 'zenburn'
];

/**
 * The map of command ids used by the CodeMirror editor.
 */
export
const COMMANDS = {
  lineNumbers: 'codeMirrorEditor:line-numbers',
  lineWrap: 'codeMirrorEditor:line-wrap',
  matchBrackets: 'codeMirrorEditor:match-brackets',
  vimMode: 'codeMirrorEditor:vim-mode',
  defaultMode: 'codeMirrorEditor:default-mode',
  changeTheme: 'codeMirrorEditor:change-theme'
}

/**
 * A code mirror editor widget factory.
 */
export
class CodeMirrorEditorWidgetFactory extends EditorWidget.Factory {

  /**
   * A tracker for editor widgets created by this factory.
   */
  tracker = new FocusTracker<CodeMirroStandaloneEditorWidget>()

  /**
   * Create a new factory.
   */
  constructor(private _app: JupyterLab, private _pallete: ICommandPalette) {
    super();
  }

  /**
   * Diposes this factory.
   */
  dispose() {
    if (this.isDisposed) {
      return;
    }
    super.dispose();

    this._app = null;
    this._pallete = null;
    this.tracker.dispose();
    this.tracker = null;
  }

  /**
   * Create a new widget given a context.
   */
  createNew(context: IDocumentContext<IDocumentModel>, kernel?: IKernel.IModel): EditorWidget {
    if (kernel) {
      context.changeKernel(kernel);
    }
    const editor = new CodeMirroStandaloneEditorWidget({
      extraKeys: {
        'Tab': 'indentMore',
      },
      indentUnit: 4,
      theme: DEFAULT_CODEMIRROR_THEME,
      lineNumbers: true,
      lineWrapping: true,
    });
    const decorator = StandaloneEditorWidget.defaultDecoratorProvider(editor);
    editor.presenter = StandaloneEditorWidget.defaultPresenterProvider(decorator);
    editor.presenter.context = context;
    
    this.widgetCreated.emit(editor);
    this.tracker.add(editor);
    return editor;
  }

  /**
   * Registers menu items for code mirror standalone editor.
   */
  registerMenuItems(menu: Menu) {
    const { commands, keymap } = this._app;

    const settingsMenu = new Menu({ commands, keymap });
    settingsMenu.title.label = 'Settings';
    settingsMenu.addItem({ command: COMMANDS.lineNumbers });
    settingsMenu.addItem({ command: COMMANDS.lineWrap });
    settingsMenu.addItem({ command: COMMANDS.matchBrackets });
    settingsMenu.addItem({ command: COMMANDS.defaultMode });
    settingsMenu.addItem({ command: COMMANDS.vimMode });

    const themeMenu = new Menu({ commands, keymap });
    themeMenu.title.label = 'Theme';
    for (const theme of THEMES) {
      const args:JSONObject = {};
      args[THEME_PROPERTY] = theme;
      themeMenu.addItem({
        command: COMMANDS.changeTheme,
        args
      });
    }

    menu.addItem({ type: 'submenu', menu: settingsMenu });
    menu.addItem({ type: 'submenu', menu: themeMenu });
  }

  /**
   * Registers commands for code mirror standalone editor.
   */
  registerCommands(category?: string) {
    this.registerCommand({
      id: COMMANDS.lineNumbers,
      execute: () => { this.toggleLineNums(); },
      label: 'Toggle Line Numbers',
      category
    })
    this.registerCommand({
      id: COMMANDS.lineWrap,
      execute: () => { this.toggleLineWrap(); },
      label: 'Toggle Line Wrap',
      category
    })
    this.registerCommand({
      id: COMMANDS.matchBrackets,
      execute: () => { this.toggleMatchBrackets(); },
      label: 'Toggle Match Brackets',
      category
    })
    this.registerCommand({
      id: COMMANDS.defaultMode,
      execute: () => { this.toggleDefault(); },
      label: 'Vim Mode Off',
      category
    })
    this.registerCommand({
      id: COMMANDS.vimMode,
      execute: () => { this.toggleVim(); },
      label: 'Vim Mode',
      category
    })

    this._app.commands.addCommand(COMMANDS.changeTheme, {
      label: args => {
        return args[THEME_PROPERTY] as string;
      },
      execute: args => {
        const name: string = args[THEME_PROPERTY] as string || DEFAULT_CODEMIRROR_THEME;
        each(this.tracker.widgets, widget => {
          widget.editor.setOption(THEME_PROPERTY, name);
        });
      }
    });
  }

  /**
   * Registers a commnand.
   */
  protected registerCommand(options: {
    id: string,
    execute: () => void
    label: string
    category?: string
  }) {
    this._app.commands.addCommand(options.id, {
      execute: options.execute,
      label: options.label,
    });
    this._pallete.addItem({
      command: options.id,
      category: options.category
    })
  }

  /**
   * Toggle editor line numbers
   */
  toggleLineNums() {
    const widget = this.tracker.currentWidget;
    if (widget) {
      const lineNumbers = widget.getConfiguration().lineNumbers; 
      widget.getConfiguration().lineNumbers = !lineNumbers;
    }
  }

  /**
   * Toggle editor line wrap
   */
  toggleLineWrap() {
    const widget = this.tracker.currentWidget;
    if (widget) {
      const editor = widget.editor;
      editor.setOption('lineWrapping', !editor.getOption('lineWrapping'));
    }
  }

  /**
   * Toggle editor matching brackets
   */
  toggleMatchBrackets() {
    const widget = this.tracker.currentWidget;
    if (widget) {
      const editor = widget.editor;
      editor.setOption('matchBrackets', !editor.getOption('matchBrackets'));
    }
  }

  /**
   * Turns on the editor's vim mode
   */
  toggleVim() {
    each(this.tracker.widgets, widget => {
      widget.editor.setOption('keyMap', 'vim');
    });
  }

  /**
   * Sets the editor to default editing mode
   */
  toggleDefault() {
    each(this.tracker.widgets, widget => {
      widget.editor.setOption('keyMap', 'default');
    });
  }
}